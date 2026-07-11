# Burn Studio — uncommitted worklog

**Do not commit until Jay reviews.**

## Already on main (previous session)

- Full burn-studio scaffold: doctrine, engine, recorder, synthetic, WebGL, UI
- Integrity tests (snapshot deep-copy bug fixed)
- Linked from `dev-compute-visuals.html` only
- Commit was `745de55` (before “no commit” instruction)

## Uncommitted since “no commit until review”

### New modules
| File | Purpose |
|------|---------|
| `js/adaptor-ingress.js` | Identity-free envelope → spark/α/collapse; rejects userId etc. |
| `js/pipeline-view.js` | Derive fast-path stage lights + event lines from log |
| `js/compare.js` | Dual-pack compare at progress (pure metrics/hash) |

### UI upgrades
- Pipeline overlay on canvas (Spark → α → Validate → Route → React → Extinguish → ⊥₀)
- Event-at-scrub + recent trail
- Veto breakdown v1–v6
- Replay speed control
- **Inject spark** (adaptor path)
- Keys: Space, ←/→, Home/End, V, G, I

### Live path
- Live burn now uses `BurnAdaptor.injectEnvelope` (same code as manual inject)

### Tests extended
- Identity extinction
- Adaptor inject + loadPack
- Pipeline derive
- Compare identical packs

### Synthetic
- Collapse stages always emit validate → route → react order

## How to review

```bash
node burn-studio/tests/run-tests.mjs
# open http://localhost:<port>/burn-studio/
```

## Still not done (next sessions)

- Wire real terminal.html / game.html sparks into ingress
- Dual-burn UI compare panel
- Optional snapshot-lite packs (smaller export without full lattice restore — keep full for correctness)
- Public nav promote (only when you say)
