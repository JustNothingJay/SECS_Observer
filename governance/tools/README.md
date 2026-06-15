# Governance Tools

## catalog_validator.py

Deterministic validator for source-of-truth catalog artifacts.

Usage:

```bash
python governance/tools/catalog_validator.py --mode pre_publish
python governance/tools/catalog_validator.py --mode retrospective_audit
```

Output:
- `governance/reports/catalog_validation_report.json` by default

Exit codes:
- `0` pass
- `1` fail (blocking)

## stage_gate_runner.py

Deterministic stage-gate executor. Runs governance gates and blocks progression on failure.

Usage:

```bash
py -3 governance/tools/stage_gate_runner.py --track pre_publish --stage S4
py -3 governance/tools/stage_gate_runner.py --track retrospective_audit --stage S4
```

Output:
- `governance/reports/stage_gate_report.json` by default

## content_validator.py

Validates publication content integrity errors:
1. PDF pipeline conflicts
2. LaTeX formula duplicates
3. Numbering collisions

Usage:

```bash
py -3 governance/tools/content_validator.py --mode pre_publish
py -3 governance/tools/content_validator.py --mode retrospective_audit
```

## acknowledgement_validator.py

Validates retrospective finding acknowledgement completeness.

Usage:

```bash
py -3 governance/tools/acknowledgement_validator.py --mode retrospective_audit
```

## build_catalog_from_corpus.py

Builds non-empty catalog data from local corpus sources.

Current outputs include:
1. deterministic chunk manifests
2. citation evidence provenance suitable for same-interface audit pull

Usage:

```bash
py -3 governance/tools/build_catalog_from_corpus.py
```

Defaults:
- research root: `C:\SECS_Research\papers`
- sovereign root: `C:\SECS_Sovereign`

## request_logger.py

Appends a separate anonymous request log entry without storing identity fields.

Usage:

```bash
py -3 governance/tools/request_logger.py --query-text "What does the corpus say about alpha?" --intent-type fact_check --request-mode interactive_query --release-status released
```

Stored fields are hashes and catalog references only; raw query text is not persisted.

## falsification_logger.py

Appends a public, replayable falsification challenge entry with no secret inputs.

Usage:

```bash
py -3 governance/tools/falsification_logger.py --target-type claim --target-id claim-alpha-001 --challenge-summary "Independent replay disproves derivation under declared inputs" --falsification-mode reproduction_failure --replay-instructions "Run the declared derivation against snapshot inputs and compare emitted constant." --expected-failure-condition "Replay emits a materially different result than the published claim."
```

Challenges are logged as testable and must remain publicly replayable.

## falsification_resolver.py

Updates a challenge after replay review. Writes to `governance/catalog/data/falsification_register.json`; commit and push to publish on the live console.

Reject a smoke test or failed replay attempt:

```bash
py -3 governance/tools/falsification_resolver.py --challenge-id challenge-20260406T051640-03c1c3a2f6 --status rejected_with_reason --resolution-note "Replay under declared snapshot produced stable output; no inconsistency observed."
```

Substantiate a challenge (replay disproved the claim — requires tightening work):

```bash
py -3 governance/tools/falsification_resolver.py --challenge-id <id> --status substantiated --acknowledgement-note "Replay reproduced divergent output." --action-plan "Tighten claim wording and re-seal snapshot after corpus fix." --due-utc 2026-05-01T00:00:00+00:00
```

## governed_runtime_server.py

Runs a lightweight local server for the governed console.

Usage:

```bash
py -3 governance/tools/governed_runtime_server.py
```

Serves:
1. the static site
2. `POST /api/query` for atomic request logging and sealed trace creation

Default URL:
`http://127.0.0.1:8017/governed-console.html`

## Track-specific Content Inputs

- `governance/catalog/data/content_audit_input.pre_publish.json`
- `governance/catalog/data/content_audit_input.retro.json`

This separation prevents retrospective failure discovery data from contaminating pre-publish release gates.
