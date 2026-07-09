#!/usr/bin/env python3
"""
Public reproduction of Equation (C) — secs.observer/equation.html

  alpha^{-1} + S * alpha = 4*pi^3 + pi^2 + pi
  S = sum_{n>=1} (2n-1)!! / (4n)!

Requires: Python 3.9+, mpmath
  pip install mpmath

Usage (from this directory):
  python reproduce_C.py

Writes nothing required for the page; prints values and verifies SHA-256
of the frozen canonical ledger when present.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

try:
    from mpmath import mp, mpf, sqrt, pi, factorial, nstr
except ImportError:
    print("Install mpmath:  pip install mpmath", file=sys.stderr)
    raise SystemExit(1)

HERE = Path(__file__).resolve().parent
TABLE = HERE / "experimental_alpha_table.json"
LEDGER = HERE / "canonical_ledger.txt"
DPS = 80
mp.dps = DPS


def double_factorial(n: int) -> mpf:
    if n <= 0:
        return mpf(1)
    r, k = mpf(1), n
    while k > 0:
        r *= k
        k -= 2
    return r


def compute_S(n_max: int = 40) -> mpf:
    S = mpf(0)
    used = 0
    for n in range(1, n_max + 1):
        term = double_factorial(2 * n - 1) / factorial(4 * n)
        S += term
        used = n
        if term < mpf("1e-60"):
            break
    return S, used


def alpha_inv(S: mpf, K: mpf) -> mpf:
    a = (K - sqrt(K**2 - 4 * S)) / (2 * S)
    return 1 / a


def main() -> int:
    print("=" * 72)
    print("Equation (C) reproduction — low-energy alpha only (Thomson limit)")
    print("Form: alpha^{-1} + S*alpha = 4*pi^3 + pi^2 + pi")
    print("=" * 72)

    S, n_used = compute_S()
    K = 4 * pi**3 + pi**2 + pi
    ainv = alpha_inv(S, K)

    print(f"\nmpmath dps        : {DPS}")
    print(f"S terms used      : {n_used}")
    print(f"S                 : {nstr(S, 30)}")
    print(f"K(pi)             : {nstr(K, 30)}")
    print(f"alpha^{-1}_alg    : {nstr(ainv, 30)}")
    print("\nScale: conventional low-energy fine-structure constant only.")
    print("Not alpha(M_Z). Not a QED derivation. Conjectural constraint.\n")

    if TABLE.exists():
        table = json.loads(TABLE.read_text(encoding="utf-8"))
        print(f"Residuals vs {table['table_id']}:")
        print(f"{'source':<28} {'ppb':>12} {'|D|/s':>10}  DOI")
        for src in table["sources"]:
            meas = mpf(src["alpha_inv"])
            unc = mpf(src["unc"])
            delta = ainv - meas
            ppb = float(delta / ainv * mpf("1e9"))
            sig = float(abs(delta) / unc)
            print(f"{src['id']:<28} {ppb:>+12.6f} {sig:>10.4f}  {src['doi']}")
    else:
        print("(experimental_alpha_table.json not found — values only)")

    if LEDGER.exists():
        text = LEDGER.read_text(encoding="utf-8")
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        print(f"\nFrozen ledger SHA-256: {digest}")
        print(f"(file: {LEDGER.name})")
        expected = "9f31bfed7989da097fc20bfe221119a5f325a8429605972907e9d6daacda8df9"
        if digest == expected:
            print("MATCH expected frozen hash.")
        else:
            print("NOTE: hash differs from 2026-07-10 freeze — table or precision changed.")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
