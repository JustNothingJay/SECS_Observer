# Burn Studio

Public browser demo for deterministic burn visualisation and artifact replay on [secs.observer](https://secs.observer/burn-studio/).

```text
https://secs.observer/burn-studio/
```

Locally: serve the Observer root over HTTP and open `/burn-studio/`:

```bash
npx --yes serve -l 5173 .
# → http://localhost:5173/burn-studio/
```

Also linked from [Compute demos](../dev-compute-visuals.html).

## What it is

- **Append-only event log** (sparks, α, collapse, slow ticks, panic/recover)
- **Deterministic fold** — same seed + log ⇒ same state hash
- **Snapshot seek** — scrub with verified restore + forward fold
- **WebGL projection** — fast-path lattice; slow path is observe-only
- **Import / export** — JSON burn packs with chain hashes

## What it is not

- Not live Sovereign Fly admission (use the [Terminal](../terminal.html) for that)
- Not production neurotrophic Phase A–E wiring
- Not a pre-recorded video — every frame is a recompute from the log

## Doctrine

See [DOCTRINE.md](./DOCTRINE.md).

## Tests

```bash
node burn-studio/tests/run-tests.mjs
```

Must exit 0. Covers: deterministic synthetic burns, chain integrity, seek≡fold, corrupt pack rejection, slow-path lattice isolation.

## Layout

```text
burn-studio/
  DOCTRINE.md
  README.md
  index.html
  css/burn-studio.css
  js/   hash, rng, schema, engine, recorder, synthetic-burn, renderer, app
  tests/run-tests.mjs
  fixtures/   (optional sample packs)
```
