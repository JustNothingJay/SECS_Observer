# 05 — Expanded ansatz scan + statistical rarity

**UTC:** 2026-07-09T14:31:00.959849+00:00  

## Combined sample

| Metric | Value |
|---|---:|
| Valid candidates | 32176 |
| Within 0.1 ppb of CODATA 2022 | 6 |
| Within 1 ppb | 6 |
| Within 10 ppb | 11 |
| Fraction ≤ 1 ppb | **0.01865%** |
| Fraction ≤ 0.1 ppb | **0.01865%** |
| Equation (C) rank | **4** |
| Unique coeff tuples ≤ 1 ppb | 2 |

**Rarity statement:** Within the declared combined sample of 32176 valid candidates, only 6 (0.0186%) land within 1 ppb of CODATA 2022, and 6 (0.0186%) within 0.1 ppb. Equation (C) rank = 4.

**Interpretation (corrected read of the table):**  
All six sub-ppb hits are the **same geometric polynomial** $4\pi^3+\pi^2+\pi$ (optionally with a zero $\pi^4$ term) under $S_{\mathrm{two}}$ or $S_{\mathrm{full}}$ (and duplicated across scan families).  
No rival geometric form enters the sub-ppb band. Rank “4” is bookkeeping (duplicates + two-term $S$ slightly closer to CODATA than full $S$).  
**Geometric exclusivity is strong; $S$-truncation is a diagnostic, not a competing theory.**

## Per family

### A_cubic_core_S (n=17768)

- ≤0.1 ppb: 2, ≤1 ppb: 2, ≤10 ppb: 3

### B_cubic_broad_S (n=6448)

- ≤0.1 ppb: 2, ≤1 ppb: 2, ≤10 ppb: 5

### C_quartic_core_S (n=7960)

- ≤0.1 ppb: 2, ≤1 ppb: 2, ≤10 ppb: 3

## Top 12 overall

| Rank | Family | S | Poly | ppb | C? |
|---:|---|---|---|---:|---|
| 1 | cubic_core_S | `S_C_two` | `4π³+1π²+1π+0` | 0.0032 |  |
| 2 | cubic_broad_S | `S_C_two` | `4π³+1π²+1π+0` | 0.0032 |  |
| 3 | quartic_core_S | `S_C_two` | `0π⁴+4π³+1π²+1π+0` | 0.0032 |  |
| 4 | cubic_core_S | `S_C_full` | `4π³+1π²+1π+0` | 0.0049 | **YES** |
| 5 | cubic_broad_S | `S_C_full` | `4π³+1π²+1π+0` | 0.0049 | **YES** |
| 6 | quartic_core_S | `S_C_full` | `0π⁴+4π³+1π²+1π+0` | 0.0049 | **YES** |
| 7 | cubic_broad_S | `S_alt_B` | `4π³+1π²+1π+0` | 1.3169 |  |
| 8 | cubic_broad_S | `S_alt_D` | `4π³+1π²+1π+0` | 2.6381 |  |
| 9 | cubic_core_S | `S_C_one` | `4π³+1π²+1π+0` | 3.9590 |  |
| 10 | cubic_broad_S | `S_C_one` | `4π³+1π²+1π+0` | 3.9590 |  |
| 11 | quartic_core_S | `S_C_one` | `0π⁴+4π³+1π²+1π+0` | 3.9590 |  |
| 12 | cubic_broad_S | `S_alt_C` | `4π³+1π²+1π+0` | 1778.9609 |  |

## What a referee should accept / reject

- **Accept as:** sample-restricted rarity of near-hits under a pre-declared family.
- **Reject as:** probability over “all formulas humans might invent.”
- **Publishable phrasing:** “Among N pre-specified zero-parameter candidates of type …, only k fell within 1 ppb of CODATA 2022; Equation (C) is among them.”
