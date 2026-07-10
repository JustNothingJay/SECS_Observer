# Burn Studio (isolated)

**Not linked from public Observer nav.** Laboratory surface for deterministic burn visualisation and artifact replay.

Open locally: serve the Observer root (or this folder) over HTTP and visit:

```text
/burn-studio/
```

Or from repo root with any static server:

```bash
npx --yes serve -l 5173 .
# → http://localhost:5173/burn-studio/
```

## What it is

- **Append-only event log** (sparks, α, collapse, slow ticks, panic/recover)
- **Deterministic fold** — same seed + log ⇒ same state hash
- **Snapshot seek** — O(1)-ish scrub with verified restore + forward fold
- **WebGL projection** — fast-path lattice; slow path is observe-only strip
- **Import / export** — JSON burn packs with chain hashes

## What it is not

- Not Sovereign Fly admission
- Not production neurotrophic Phase A–E
- Not a pre-recorded video
- Not public marketing (yet)

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

## Promote later

When ready: link from `dev-compute-visuals.html` or nav, add sitemap entry, wire real terminal/game sparks into the same schema (`source: terminal|game`).
