# Equation (C) — public reproduction pack

Companion to **[equation.html](../equation.html)** on secs.observer.

## Claim status

**Conjectural zero-parameter constraint** on the **low-energy** fine-structure constant  
(Thomson limit / CODATA-style $\alpha^{-1}\approx 137.036$).

Not a derivation from QED. Not a claim about $\alpha(M_Z)$ or GUT-scale couplings.

## Reproduce

```bash
pip install mpmath
python reproduce_C.py
```

Expected algebraic value (80 dps evaluation):

```
alpha^{-1}_alg = 137.035999176335249646269238634...
```

Frozen ledger hash (2026-07-10 table):

```
SHA-256 = 9f31bfed7989da097fc20bfe221119a5f325a8429605972907e9d6daacda8df9
```

## Files

| File | Role |
|------|------|
| `reproduce_C.py` | Recompute $S$, $\alpha_{\mathrm{alg}}$, residuals |
| `experimental_alpha_table.json` | Frozen lab/CODATA sources + DOIs |
| `canonical_ledger.txt` | Hashed residual ledger |
| `frozen_evaluation.json` | Full machine-readable eval dump |
| `ansatz_neighbourhood.json` | Controlled ansatz scan dump |

Full methodology lives in the private/work library: `C:\SECS_Library\equation-c\`.

## Expanded scan (05)
See `ansatz_expanded_stats.md`: 32176 candidates; 0.0187% within 1 ppb of CODATA 2022; all near-hits share geometric side of (C).

