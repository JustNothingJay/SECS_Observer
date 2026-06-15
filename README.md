# SECS Observer — secs.observer

Public-facing website for the SECS (Sovereign Execution & Collapse Substrate) research programme.

**Live site:** [https://secs.observer](https://secs.observer)

---

## What it is

A static site presenting the unified framework that treats thermodynamic, algebraic, biological, and computational systems as expressions of the same underlying structure. One tower equation — zero measured inputs — derives α, μ, mₑ, mₚ, and G from π alone.

## Tech stack

| Layer | Tool |
|-------|------|
| Markup | HTML5 + CSS3 + vanilla JS |
| UI | Bootstrap 4, Font Awesome 6.5, Animate.css |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
| Analytics | GA4 (identity-free, no cookies) |
| Hosting | GitHub Pages (CNAME → secs.observer) |

No build step. No framework. No backend.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Overview, card links to main sections |
| Founder | `founder.html` | Jay Carpenter — background and motivation |
| System Architecture | `architecture.html` | Mermaid layer diagrams, collapse pipeline, adaptors |
| Governed Console | `governed-console.html` | Snapshot, stage gates, request ledger, falsification register |
| Citation Audit | `citation-audit.html` | Two-pass reference verification report |
| Sovereign | `sovereign.html` | Deterministic observation substrate — specs, use cases, adaptors |
| Neurotrophic OS | `neurotrophic.html` | Behavioural observation and predictive modelling layer |
| Research | `research.html` | 47 published works · 37 Zenodo DOIs · 4 software packages |

| Journal | `journal.html` | Announcements |
| JJ's Fingerprint | `fingerprint.html` | Research fingerprint |
| GTF | `gtf.html` | Gestational Timing Framework |
| The Game: SECS | `game.html` | Interactive substrate game |
| Terminal | `terminal.html` | Interactive substrate game |

## Architecture diagrams

`architecture.html` renders six Mermaid flowcharts (external world through adaptor deployment).
Legacy PNGs remain in `assets/arch/` for reference.

## Local development

Open `index.html` in a browser. No install required.

## Related repositories

- [SECS_Research](https://github.com/JustNothingJay/SECS_Research) — DOI-registered paper corpus (47 published works · 37 Zenodo DOIs)
- SECS Sovereign substrate — private repository; live gate at [terminal.html](terminal.html) (`secs-sovereign.fly.dev`)
- [mobius-constant](https://github.com/JustNothingJay/mobius-constant) — Exact irrational arithmetic
- [mobius-number](https://github.com/JustNothingJay/mobius-number) — IEEE 754 floating-point fix
- [mobius-integer](https://github.com/JustNothingJay/mobius-integer) — Dual-strand integer (Rust)
- [mobius-units](https://github.com/JustNothingJay/mobius-units) — Fundamental constants from the eigenvalue tower

## Author

Jay Carpenter

## License

See [LICENSE](LICENSE) for details.
