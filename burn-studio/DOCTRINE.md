# Burn Studio — Doctrine

**Job:** make the formal burn object *visible* and *replayable* without soft-middle demos.

## Non-negotiables (SECS standards)

1. **Artifacts are truth.** The GPU never invents state. Pixels are a projection of `fold(seed, events[0..seq])`.
2. **Determinism.** Same seed + same event log ⇒ same state hash at every sequence index. Always.
3. **Append-only log.** Events are never edited in place. Corrections are new events or a new burn.
4. **Identity extinction.** No user ids, sessions, emails, or adaptor identity in the log. Sparks carry payload digests only.
5. **Fast path ≠ slow path.** Fast path collapses sparks (α → stages → purity/veto). Slow path *observes* and may emit `slow_tick` only — never blocks or rewrites fast-path history.
6. **Explicit non-claims.** This studio does not prove silicon, Fly runtime admission, or neurotrophic Phase A–E production wiring. It proves the **replay contract** and a faithful visual of collapse semantics.
7. **No cute shortcuts.** No pre-baked video. No random colours without a seed. No “approximate” seek that skips fold without a verified snapshot.

## Ontology

| Term | Meaning here |
|------|----------------|
| **Burn** | One finite run: seed + ordered events + chain hashes |
| **Spark** | Boundary input (identity-free envelope digest + lattice site) |
| **α** | Admissibility decision (pass or veto class v1–v6) |
| **Collapse** | Multi-stage irreversible hop on admissible cells |
| **Purity** | Return toward idle after collapse age expires |
| **Slow tick** | Observation sample (φ-ish ratio, stress, phase labels) |
| **Snapshot** | Full serialisable state at a seq for O(1) seek after verify |

## Replay contract

```
state(seq) = fold(initial_state(seed, grid), events where e.seq <= seq)
hash(seq)  = H(canonical(state(seq)))
chain(i)   = H(chain(i-1) || canonical(event_i))
```

Seeking to time T uses the latest snapshot with `snap.seq <= target`, then folds forward. Snapshot must match recomputed hash or the burn is **corrupt** (hard fail).

## Scope

- Lives under `/burn-studio/` on secs.observer.
- Runs entirely in the browser; it does not mutate the live Sovereign runtime.
- May consume sparks from terminal/game via the same event schema (`source: terminal|game`).
