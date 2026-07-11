# SECS Observer — secs.observer

Public-facing website for **SECS** (Sovereign Execution and Collapse Substrate): runnable systems language, research surfaces, and founder / hire path.

**Live site:** [https://secs.observer](https://secs.observer)

---

## What it is

A mostly **static** site with:

| Layer | Role |
|-------|------|
| **Product / systems** | Collapse, envelopes, gates, architecture, terminal, game — constitution and runnable story (**Thread A–B**). Does **not** depend on constants research shipping. |
| **Research** | Papers, Equation (C), timeline, citation audit, governed console — graded claims (**Thread D** and related). |
| **Founder / market** | Founder page + **AI · IT · Ops** hire path (operators and logistics/warehouse AI–IT roll-outs). |

**Not** the load-bearing claim of the homepage: “one tower equation derives every constant.”  
**Equation (C)** is presented as a **checkable low-energy conjecture** (see `equation.html` + `equation-c/`), not as QED replacement or a proven cascade.

Deeper UI inventory: [`ui-map.md`](ui-map.md) · gameplay: [`gameplay-map.md`](gameplay-map.md).

---

## Tech stack

| Layer | Tool |
|-------|------|
| Markup | HTML5 + CSS3 + vanilla JS |
| Shared chrome | `js/includes.js` (nav, footer, GA bootstrap, research PDF modal) |
| UI | Bootstrap 4, Font Awesome, Animate.css |
| Math (Equation C) | KaTeX on `equation.html` |
| Analytics | GA4 property `G-667KK00S7H` |
| Hosting | GitHub Pages (`CNAME` → secs.observer) |
| Live gate (optional) | Terminal / game talk to `secs-sovereign.fly.dev` when online |

No app framework. No Observer backend for page content. Optional local tools under `governance/` and `tools/`.

### Minified assets

Production pages often load `css/secs.min.css` and `js/includes.min.js`.  
Source of truth for nav/analytics logic: **`js/includes.js`**. After editing includes, re-minify if you ship `.min.js`:

```text
tools/minify-assets.mjs
```

---

## Primary navigation (live)

Defined in `js/includes.js` / `includes.min.js`:

| Nav | Destinations |
|-----|----------------|
| Home | `index.html` |
| Founder | `founder.html` |
| AI · IT · Ops | `ai-it-ops.html` |
| JJ’s Fingerprint | `fingerprint.html` |
| **Systems** | Architecture · Terminal · Game · Neurotrophic OS · Neurotrophic Proof · Sovereign · Vertical Surfaces · Workflow Demos · GTF |
| **Research** | Equation (C) · Papers · Timeline · Citation Audit · Governed Console |
| **More** | Glossary · Journal · Compute demos |

`services.html` **redirects** to `ai-it-ops.html` (legacy URL).

---

## Page index

### Core

| Page | File | Notes |
|------|------|--------|
| Home | `index.html` | Entry, overview, CTAs |
| Founder | `founder.html` | Jay Carpenter |
| AI · IT · Ops | `ai-it-ops.html` | Hire / excellence engineering — dual market (operators + logistics AI/IT) |
| JJ’s Fingerprint | `fingerprint.html` | Research fingerprint narrative |

### Systems

| Page | File | Notes |
|------|------|--------|
| Architecture | `architecture.html` | Envelopes, collapse pipeline, floor-to-board story |
| Terminal | `terminal.html` | CRT console — envelopes / live gate when available |
| The Game | `game.html` | Same gate language, game presentation + envelope primer |
| Neurotrophic OS | `neurotrophic.html` | Behavioural observation layer |
| Neurotrophic Proof | `neurotrophic-proof.html` | Proof / demo surface |
| Sovereign | `sovereign.html` | Deterministic substrate positioning |
| Vertical Surfaces | `verticals.html` | Adaptor / vertical config |
| Workflow Demos | `vertical-demo.html` | Per-vertical walkthroughs (e.g. `?vertical=robotics`) |
| GTF | `gtf.html` | Gestational Timing Framework (public) |
| JJ GTF | `jj-gtf.html` | Extended GTF surface (secondary) |

### Research

| Page | File | Notes |
|------|------|--------|
| Equation (C) | `equation.html` | Public face of α–π constraint; low-energy only; kill conditions |
| Reproduce pack | `equation-c/` | Frozen ledger, experimental table, `reproduce_C.py` |
| Papers | `research.html` | Paper cards → GitHub raw PDFs; modal + GA download events |
| Timeline | `timeline.html` | Programme arc |
| Citation Audit | `citation-audit.html` | Reference verification report |
| Governed Console | `governed-console.html` | Catalog / stage-gate / falsification UI (local data under `governance/`) |

### More / secondary

| Page | File | Notes |
|------|------|--------|
| Glossary | `glossary.html` | Terms ↔ industry language |
| Journal | `journal.html` | Public journal / build log |
| Journal author | `journal-author.html` | Authoring helper (not primary nav) |
| Compute demos | `dev-compute-visuals.html` | Public compute demos hub |
| Propagation | `propagation.html` (+ v1/v2) | Field / heal visualisations |
| Burn Studio | `burn-studio/` | Local burn pipeline UI (see its README) |
| Origin | `origin.html` | Secondary narrative |
| Apps | `apps.html` | Secondary listing |

Sitemap: [`sitemap.xml`](sitemap.xml) (may lag new pages — update when shipping).

---

## Analytics (GA4)

| Item | Detail |
|------|--------|
| Property | `G-667KK00S7H` |
| Bootstrap | `includes.js` injects gtag when host is **not** `localhost` / `127.0.0.1` |
| Default | Page views + engagement (identity-free intent; no first-party user ID) |
| Research downloads | Custom event **`pdf_download`** (and **`pdf_preview`**) from paper cards |

### PDF download events

Implemented only on **`research.html`** paper cards (`initResearchPage` in `includes.js`):

| Trigger | Event |
|---------|--------|
| PDF badge click | `pdf_download` |
| Modal “Download PDF” | `pdf_download` |
| Middle-click / ctrl+click on card | `pdf_download` |
| Left-click open modal | `pdf_preview` |

Payload fields:

- `event_category`: `research`
- `event_label`: filename (last path segment)
- `paper_title`: card title
- `file_url`: full href (GitHub raw PDF)

**There is no separate SECS server log for downloads.**  
Filenames appear only inside **GA event parameters** (Event label / Explore / custom dimensions if registered). PDFs themselves are served from **GitHub raw** (`JustNothingJay/SECS_Research`), not from this repo’s static host as the primary file store.

Other exports (e.g. Burn Studio JSON, JJ GTF export) are **not** counted as `pdf_download` unless separately instrumented.

---

## Equation (C) pack

| Path | Role |
|------|------|
| `equation.html` | Human-readable public note |
| `equation-c/reproduce_C.py` | Stranger-reproducible evaluation |
| `equation-c/canonical_ledger.txt` + JSON/MD | Frozen residual artifacts |

Full Thread D integrity / pre-reg / adversarial suite may live in the broader library (`SECS_Library/equation-c`); Observer ships a **public subset** for the site.

**Grade (public):** conjecture (checkable), low-energy α only — not “proven law” or cascade proof.

---

## Local development

1. Open any `*.html` in a browser, or serve the folder (e.g. any static server) so relative paths resolve cleanly.  
2. GA does not load on localhost via shared include.  
3. Terminal/game need the Fly gate only for live envelopes; static copy still works offline.  
4. Governed console / catalog tools: see `governance/tools/README.md` if present.

---

## Repo layout (high level)

```text
SECS_Observer/
  *.html                 Public pages
  js/includes.js         Nav, footer, GA, research PDF modal  (source)
  js/includes.min.js     Minified for production pages
  css/secs.css           Design system source
  assets/                Favicon, OG, architecture PNGs
  equation-c/            Public Equation (C) reproduce pack
  research.html          Paper index (PDFs on GitHub)
  burn-studio/           Burn pipeline mini-app
  governance/            Catalog, validators, traces (local/audit)
  draft/                 Working notes (not necessarily public)
  tools/                 Minify helpers
  sitemap.xml, robots.txt, CNAME
```

---

## Related repositories

| Repo | Role |
|------|------|
| [SECS_Research](https://github.com/JustNothingJay/SECS_Research) | DOI-registered paper corpus; PDFs linked from `research.html` |
| SECS Sovereign | Private substrate; live gate used by terminal/game |
| [mobius-constant](https://github.com/JustNothingJay/mobius-constant) | Exact irrational arithmetic |
| [mobius-number](https://github.com/JustNothingJay/mobius-number) | IEEE 754 floating-point fix |
| [mobius-integer](https://github.com/JustNothingJay/mobius-integer) | Dual-strand integer (Rust) |
| [mobius-units](https://github.com/JustNothingJay/mobius-units) | Units / constants tooling |

---

## Author

Jay Carpenter — [jay@secs.observer](mailto:jay@secs.observer)

## License

See [LICENSE](LICENSE) if present in this repository; otherwise all rights reserved © 2026 Jay Carpenter.
