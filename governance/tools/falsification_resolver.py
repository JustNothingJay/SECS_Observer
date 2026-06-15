#!/usr/bin/env python3
"""
Update a public falsification challenge after replay review.

Typical outcomes:
- rejected_with_reason — replay held; challenge does not falsify the claim
- substantiated — replay failed; research must tighten (requires action_plan)
- corrected — issue fixed in corpus or governance artifacts
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[2]
REGISTER_PATH = ROOT / "governance" / "catalog" / "data" / "falsification_register.json"

ALLOWED_STATUSES = {
    "logged",
    "acknowledged",
    "substantiated",
    "rejected_with_reason",
    "corrected",
}
ALLOWED_ACTION_STATUSES = {
    "not_started",
    "planned",
    "in_progress",
    "completed",
    "waived_with_rationale",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_register() -> Dict[str, Any]:
    if not REGISTER_PATH.exists():
        raise ValueError("missing_falsification_register")
    data = json.loads(REGISTER_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("invalid_falsification_register_root")
    return data


def find_entry(entries: List[Any], challenge_id: str) -> int:
    for index, entry in enumerate(entries):
        if isinstance(entry, dict) and entry.get("challenge_id") == challenge_id:
            return index
    raise ValueError(f"challenge_not_found:{challenge_id}")


def validate_entry(entry: Dict[str, Any]) -> None:
    status = entry.get("status")
    if status in {"acknowledged", "substantiated", "corrected"}:
        note = entry.get("acknowledgement_note")
        if not isinstance(note, str) or not note.strip():
            raise ValueError("acknowledgement_note_required_for_status:" + str(status))
    if status in {"acknowledged", "substantiated"}:
        plan = entry.get("action_plan")
        if not isinstance(plan, str) or not plan.strip():
            raise ValueError("action_plan_required_for_status:" + str(status))
        if not entry.get("due_utc"):
            raise ValueError("due_utc_required_for_status:" + str(status))
    if status == "rejected_with_reason":
        note = entry.get("resolution_note")
        if not isinstance(note, str) or not note.strip():
            raise ValueError("resolution_note_required_for_rejected_with_reason")


def main() -> int:
    parser = argparse.ArgumentParser(description="Resolve a falsification challenge entry")
    parser.add_argument("--challenge-id", required=True)
    parser.add_argument(
        "--status",
        choices=sorted(ALLOWED_STATUSES),
        required=True,
        help="logged | acknowledged | substantiated | rejected_with_reason | corrected",
    )
    parser.add_argument("--resolution-note", default="", help="Required for rejected_with_reason")
    parser.add_argument("--acknowledgement-note", default="")
    parser.add_argument("--action-plan", default="")
    parser.add_argument(
        "--action-status",
        choices=sorted(ALLOWED_ACTION_STATUSES),
        default="",
        help="Defaults: completed for rejected/corrected, not_started otherwise",
    )
    parser.add_argument("--due-utc", default="")
    args = parser.parse_args()

    register = load_register()
    entries = register.get("entries", [])
    if not isinstance(entries, list):
        raise ValueError("invalid_falsification_register_entries")

    index = find_entry(entries, args.challenge_id)
    entry = dict(entries[index])

    entry["status"] = args.status
    if args.acknowledgement_note.strip():
        entry["acknowledgement_note"] = args.acknowledgement_note.strip()
    if args.resolution_note.strip():
        entry["resolution_note"] = args.resolution_note.strip()
    if args.action_plan.strip():
        entry["action_plan"] = args.action_plan.strip()
    if args.due_utc.strip():
        entry["due_utc"] = args.due_utc.strip()

    if args.action_status:
        entry["action_status"] = args.action_status
    elif args.status in {"rejected_with_reason", "corrected"}:
        entry["action_status"] = "waived_with_rationale" if args.status == "rejected_with_reason" else "completed"
    elif args.status == "substantiated":
        entry["action_status"] = "planned"
    elif args.status == "acknowledged":
        entry["action_status"] = "in_progress"

    validate_entry(entry)
    entries[index] = entry
    register["entries"] = entries
    REGISTER_PATH.write_text(json.dumps(register, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "challenge_id": entry["challenge_id"],
                "status": entry["status"],
                "action_status": entry["action_status"],
                "updated_utc": utc_now(),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())