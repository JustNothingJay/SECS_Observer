# SECS Observer — Complete UI Map

> One static site. Shared shell. Multiple public surfaces.
> Research pages, framework deep dives, governed audit (local-only), and two live gate-driven interaction pages.

---

## What This Map Is

This file is the UI equivalent of the gameplay map: a plain-language structural map of the live SECS Observer surface.

It documents:

- the shared site shell
- the primary navigation topology
- the role of each page
- the interactive surfaces and what they talk to
- the hidden or secondary pages that exist outside the main nav

This is a map of the UI contract, not a design mockup.

---

## Site Shape

SECS Observer is a static HTML site with a shared header, shared footer, common CSS, and page-specific content blocks.

| Layer | Source | Role |
|---|---|---|
| Shared header/footer | `js/includes.js` | Navigation, branding, footer, analytics bootstrapping |
| Shared styling | `css/secs.css` | Core design language across the site |
| Page files | `*.html` in repo root | Each public surface is a standalone page |
| Data-backed runtime surfaces | `game.html`, `terminal.html`, `governed-console.html` | Pages that talk to a live endpoint or local runtime |
| Deep-dive explainer surfaces | `vertical-demo.html` | Template-driven page for domain workflow examples under Systems |
| Static documentation surfaces | `index.html`, `research.html`, `architecture.html`, etc. | Public explanation and evidence pages |

There is no build step and no framework runtime.

---

## Global Shell

Every major public page inherits the same top-level chrome from `js/includes.js`.

### Header

| Element | Behavior |
|---|---|
| SECS logo + wordmark | Returns to `index.html` |
| Main nav | Desktop nav with grouped dropdowns |
| Responsive nav | Mobile version of the same menu |
| Active-state highlighting | Current page is marked active in the nav |

### Footer

| Element | Behavior |
|---|---|
| Tagline | Displays the verified SECS expansion |
| Contact block | Email, LinkedIn, GitHub |
| Copyright line | Static copyright notice |
| Home-only retro counter | Added only on `index.html` |

### Shared Behavioral Systems

| System | Role |
|---|---|
| GA4 page analytics | Identity-free page analytics, disabled for localhost / 127.0.0.1 in shared include logic |
| Paper preview modal | Intercepts research paper cards and shows abstract metadata |
| Shared visual language | Gradient logo, animated section reveals, branded accent colors |

---

## Primary Navigation Map

The live navigation is grouped into five top-level paths.

| Nav Group | Destination | Purpose |
|---|---|---|
| Home | `index.html` | Main entry point and overview |
| Founder | `founder.html` | Founder identity, motivation, and context |
| JJ’s Fingerprint | `fingerprint.html` | Personal/research fingerprint page |
| Systems | `architecture.html`, `neurotrophic.html`, `sovereign.html`, `vertical-demo.html?vertical=robotics`, `gtf.html` | Substrate, architecture, domain systems (including GTF), and vertical deep-dive entry |
| Research | `research.html`, `timeline.html`, `citation-audit.html`, `Governed Console (disabled/local-only)` | Evidence and audit surfaces |
| More | `terminal.html`, `game.html`, `journal.html`, `glossary.html` | Interactive, reference, and secondary public surfaces |

---

## Page Inventory

## Core Entry Pages

| File | Title | Role in UI |
|---|---|---|
| `index.html` | SECS — Sovereign Execution and Collapse Substrate | Front door, overview, link hub |
| `founder.html` | The Founder — SECS | Founder narrative and credibility surface |
| `fingerprint.html` | JJ's Fingerprint — SECS | Identity and pattern surface |

## Systems Pages

| File | Title | Role in UI |
|---|---|---|
| `architecture.html` | System Architecture — SECS | High-level architecture diagrams and explanatory sequencing |
| `neurotrophic.html` | SECS Neurotrophic OS | Behavioral/predictive layer explanation |
| `sovereign.html` | SECS Sovereign — Deterministic Execution and Collapse Substrate | Substrate, specs, adaptors, and operating model |
| `vertical-demo.html` | SECS Vertical Demo — Governed Workflow | Per-vertical workflow deep-dive template reachable from Systems and adaptor demo links |
| `gtf.html` | Gestational Timing Framework — SECS | Domain-specific biology framework surface |

## Research and Audit Pages

| File | Title | Role in UI |
|---|---|---|
| `research.html` | SECS Research — Papers & Biological Corpus | Main paper library with category navigation and paper cards |
| `timeline.html` | SECS — Timeline | Chronological build or project progression surface |
| `citation-audit.html` | SECS Citation Audit — Verification Report | Citation verification and evidence-checking surface |
| `governed-console.html` | SECS Governed Console (local-only) | Unified governance dashboard for snapshot state, stage gates, requests, falsification, and governed queries |

## Interactive Pages

| File | Title | Role in UI |
|---|---|---|
| `terminal.html` | SECS — Sovereign Terminal | Guided CRT-style live gate interaction |
| `game.html` | The Game: SECS | Freeform dark-terminal live gate interaction |
| `journal.html` | Journal — SECS | Announcements and update log surface |

## Secondary or Utility Pages

| File | Title | Role in UI |
|---|---|---|
| `origin.html` | Where It All Started — SECS | Additional narrative/history page not currently in main nav |
| `secs-sovereign.html` | Redirecting… | Redirect or bridge page |

---

## Page-by-Page UI Function

## Home

`index.html` is the orientation page.

It should be treated as the place where a new visitor learns:

- what SECS is
- what the major branches are
- where to go next

It is the only page that receives the footer hit counter.

## Founder and Fingerprint

`founder.html` and `fingerprint.html` are identity and context surfaces.

They exist to answer:

- who built this
- why it exists
- what kind of pattern or origin story sits behind the work

These pages are explanatory, not operational.

## Systems Cluster

The Systems dropdown groups substrate specs, system architecture, domain systems (including GTF), and vertical deep-dives — without labelling Sovereign as a framework.

| Page | UI Job |
|---|---|
| `architecture.html` | Show the system as diagrams and layers |
| `neurotrophic.html` | Explain the neurotrophic or predictive branch |
| `sovereign.html` | Explain the deterministic substrate branch |
| `vertical-demo.html` | Show one concrete governed workflow inside a selected domain |
| `gtf.html` | Explain the gestational timing framework branch |

This cluster is for understanding the model before touching evidence or runtime interfaces.

The framework deep-dive entry now points to a default vertical (`robotics`) and supports domain swapping in-page.

## Research Cluster

The Research dropdown is the evidence-and-governance branch.

| Page | UI Job |
|---|---|
| `research.html` | Browse the paper corpus |
| `timeline.html` | Inspect development or publication chronology |
| `citation-audit.html` | Inspect citation integrity |
| `governed-console.html` | Local-only governance surface; currently disabled in public nav |

This is the most evidence-heavy branch of the site.

## More Cluster

The More dropdown is the experiential branch.

| Page | UI Job |
|---|---|
| `terminal.html` | Structured, guided interaction with the live gate |
| `game.html` | Less guided, challenge-oriented interaction with the same gate |
| `journal.html` | Public updates and narrative continuity |
| `glossary.html` | Functional reference — SECS terms mapped to industry equivalents across eleven layers |

---

## Research Page Map

`research.html` is a dense library page with an internal jump nav.

### Local Section Navigation

| Anchor | Meaning |
|---|---|
| `#collapse-algebra` | Algebra foundations |
| `#fine-structure` | Fine structure constant work |
| `#constraint-surface` | Topology / constraint surface work |
| `#gestational-biology` | Biology branch |
| `#synthesis-reports` | Synthesis papers and reports |
| `#software-packages` | Software outputs |
| `#bio-corpus` | Biological corpus |

### Card System

Each paper is presented as a clickable card that points to a public artifact, usually a raw GitHub PDF URL.

The shared include layer also provides a paper-preview modal backed by an internal abstract map. That means the research page is not just a file index; it is a lightweight reading and preview surface.

---

## Governed Console Map

`governed-console.html` is the new governance control surface.

It is the only page whose job is to unify answer, audit, request logging, falsification review, and source evidence on one screen.

### Governed Console Panels

| UI Area | Role |
|---|---|
| Hero | Explains the governed-console purpose |
| Snapshot summary | Shows active snapshot and top-level counts |
| Stage-gate state | Shows current governance pass/fail state |
| Request ledger | Shows identity-free request entries |
| Falsification register | Shows replayable public challenge entries |
| Citation evidence drilldown | Shows provenance and source bindings |
| Query form | Accepts governed query submission |
| Response panel | Shows released evidence brief and audit pull |

### Data Contract

| Source | Used For |
|---|---|
| `governance/catalog/data/corpus_snapshot.json` | Snapshot metadata |
| `governance/catalog/data/request_log.json` | Anonymous request ledger |
| `governance/catalog/data/falsification_register.json` | Public replay challenges |
| `governance/catalog/data/citation_catalog.json` | Citation evidence provenance |
| `governance/reports/stage_gate_report.json` | Gate outcome surface |
| `governance/traces/*.json` | Per-query trace inspection |

### Runtime Contract

When locally served through the governed runtime server, this page also talks to:

| Endpoint | Role |
|---|---|
| `GET /api/health` | Confirms runtime availability |
| `POST /api/query` | Creates request log entry, trace, and released evidence brief |

---

## Vertical Demo Map

`vertical-demo.html` is a hidden, template-driven explainer page.

It sits between `sovereign.html` and `architecture.html`:

- `sovereign.html` explains the substrate at the vertical-summary level
- `vertical-demo.html` shows one concrete governed workflow inside a selected domain
- `architecture.html` explains the deeper underlying machinery

### Entry Paths

| Source | Behavior |
|---|---|
| Sovereign adaptor cards | Open `vertical-demo.html?vertical=<slug>` for the matching domain |
| Direct URL | Loads the requested vertical or defaults to robotics |
| In-page switcher | Swaps to another vertical without compare-mode layout |

### Vertical Demo Sections

| UI Area | Role |
|---|---|
| Hero | Introduces the current vertical and why SECS fits it |
| Vertical selector | Swaps cleanly between verticals in one template |
| Mission example | Shows a concrete workflow scenario for the domain |
| Governed workflow | Maps that scenario into the substrate cycle |
| What SECS changes | Explains the specific operational advantage over conventional stacks |
| Demo constraint surface | Shows the vertical-specific governance knobs and envelopes |
| Incident and replay | Shows what a failure or veto path looks like in practice |
| Certification fit | Maps the vertical to standards, audit, or regulator pressure |

### Content Model

The page is not markdown-driven. It uses one shared HTML shell and swaps domain content from a client-side registry in `js/vertical-demo.js`.

That keeps the structure fixed while making each vertical easy to add, refine, or deep-link.

---

## Terminal vs Game

These are sibling interfaces over the same underlying gate concept, but they serve different UI moods.

| Property | `terminal.html` | `game.html` |
|---|---|---|
| Tone | Guided, CRT, structured | Dark, challenge-driven, more freeform |
| Visual language | Phosphor green terminal | Dark hacker panel aesthetic |
| User support | More explicit guidance | Less guided, more exploratory |
| Backend target | Live gate endpoint | Same live gate endpoint |
| Goal | Complete structured progression | Beat the challenge / get the banana |

This split matters because the site has two different ways of onboarding users into the live system without changing the actual governance backend.

---

## Hidden Structure Outside the Main Nav

Two files remain outside the primary visible navigation model.

| File | Meaning |
|---|---|
| `origin.html` | Historical or narrative branch page |
| `secs-sovereign.html` | Redirecting bridge page |

These are part of the site surface, but not part of the primary navigation promise.

---

## UI Flows

## Flow 1: First-Time Visitor

`index.html` → framework pages → research page → papers or citation audit

This is the explanation-first path.

## Flow 2: Evidence Reviewer

`research.html` → `citation-audit.html` → `governed-console.html`

This is the evidence-to-governance path.

## Flow 2b: Vertical Decision-Maker

`sovereign.html` → `vertical-demo.html?vertical=<domain>` → `architecture.html`

This is the domain-to-mechanism path.

## Flow 3: Interactive Explorer

`terminal.html` or `game.html`

This is the live-system path.

## Flow 4: Governance Operator

`governed-console.html` → request submission → trace review → request ledger / falsification review

This is the audit-and-runtime path.

---

## Current UI Architecture Summary

The site currently resolves into four functional layers.

| Layer | Pages |
|---|---|
| Orientation | `index.html`, `founder.html`, `fingerprint.html`, `origin.html` |
| Theory | `architecture.html`, `neurotrophic.html`, `sovereign.html`, `gtf.html`, `vertical-demo.html` |
| Evidence | `research.html`, `timeline.html`, `citation-audit.html`, `journal.html`, `governed-console.html (local-only)` |
| Runtime | `terminal.html`, `game.html`, `governed-console.html` |

This is the practical UI map of SECS Observer:

1. explain the model
2. expose the evidence
3. let the user touch the live surfaces
4. keep governance inspectable from the same public environment

---

## Recommended Use of This File

Use this file when changing:

- navigation structure
- page naming
- UI ownership of evidence vs runtime surfaces
- governed-console scope
- research-page grouping
- where a new page belongs in the site topology

If gameplay-map.md explains the live gate game, this file explains the public SECS Observer interface that surrounds it.