/* ── SECS Shared Includes ──────────────────────────────────────────
   Single source of truth for header navigation and footer.
   Loaded synchronously in <head>; called inline after placeholders.
   ─────────────────────────────────────────────────────────────── */
(function (w) {
    'use strict';

    var p = w.location.pathname;
    var page = p.substring(p.lastIndexOf('/') + 1) || 'index.html';
    if (page === '' || page === '/') page = 'index.html';

    function li(href, label) {
        var cls = (page === href) ? ' class="active"' : '';
        return '<li><a href="' + href + '"' + cls + '>' + label + '</a></li>';
    }

    var navItems =
        li('index.html', 'Home') +
        li('founder.html', 'Founder') +
        li('fingerprint.html', 'JJ\u2019s Fingerprint') +
        li('gtf.html', 'GTF') +
        li('neurotrophic.html', 'Neurotrophic OS') +
        li('sovereign.html', 'Sovereign') +
        li('research.html', 'Research') +
        li('journal.html', 'Journal') +
        li('timeline.html', 'Timeline');

    /* ── Header ─────────────────────────────────────────────────── */
    w.secsHeader = function () {
        return '<header class="site-header container animated fadeInDown">' +
            '<div class="header-wrapper"><div class="row">' +
            '<div class="col-md-3"><div class="site-branding"><a href="index.html">' +
            '<svg class="logo-svg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
            '<defs><linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" style="stop-color:#FF5E00"/>' +
            '<stop offset="100%" style="stop-color:#00B2FF"/>' +
            '</linearGradient></defs>' +
            '<circle cx="20" cy="20" r="18" fill="none" stroke="url(#logoGrad)" stroke-width="2"/>' +
            '<circle cx="20" cy="20" r="12" fill="none" stroke="url(#logoGrad)" stroke-width="1.5" opacity="0.4"/>' +
            '<circle cx="20" cy="20" r="4" fill="#48e662"/>' +
            '</svg><h1>SECS</h1></a></div></div>' +
            '<a href="#" class="toggle-nav hidden-md hidden-lg"><i class="fa fa-bars"></i></a>' +
            '<div class="col-md-9">' +
            '<nav id="nav" class="main-navigation hidden-xs hidden-sm"><ul class="main-menu">' + navItems + '</ul></nav>' +
            '<nav class="main-navigation menu-responsive hidden-md hidden-lg"><ul class="main-menu">' + navItems + '</ul></nav>' +
            '</div></div></div></header>';
    };

    /* ── Footer ─────────────────────────────────────────────────── */
    w.secsFooter = function (isHome) {
        var f = '<footer class="site-footer container text-center">' +
            '<div class="row"><div class="col-md-12"><div class="main-footer">' +
            '<p class="footer-tagline">Sovereign Execution and Collapse Substrate</p>' +
            '<div class="footer-contact">' +
            '<a href="mailto:jay@secs.observer"><i class="fa-solid fa-envelope"></i> jay@secs.observer</a>' +
            '<a href="https://www.linkedin.com/company/secs-sovereign" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>' +
            '<a href="https://github.com/JustNothingJay" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github"></i> GitHub</a>' +
            '</div></div></div></div>' +
            '<div class="row"><div class="col-md-12 copyright">' +
            '<p>&copy; 2026 Jay Carpenter. All rights reserved.</p>' +
            '</div></div>';

        if (isHome) {
            f += '<div class="row"><div class="col-md-12"><div class="retro-counter">' +
                '<img src="https://hits.sh/secs.observer.svg?style=flat&label=visits&color=333&labelColor=0a0b0d" alt="Page views" class="counter-badge">' +
                '<p class="counter-note">Page loads, not unique visitors. No cookies. No identity tracking. No fingerprinting. Just a number.</p>' +
                '<p class="jay-status">Is this thing even on? &mdash; Jay</p>' +
                '</div></div></div>';
        }

        f += '</footer>';
        return f;
    };

    /* ── Paper Preview Modal ────────────────────────────────────── */
    /* Intercepts paper-card clicks on the research page.
       Shows title + abstract (if available) + download button. */

    /* Abstract map — keyed by PDF filename (end of URL) */
    var abstracts = {
        /* Collapse Algebra */
        'PAPER__collapse-algebra__formal-foundations.pdf':
            'Foundational paper defining the four-operator algebra underlying SECS: a deterministic substrate where collapse, not randomness, drives computation.',
        'PAPER__death-as-exhaustive-veto__excluded-middle-in-natural-systems.pdf':
            'Maps biological death to the algebraic boundary where all collapse paths are exhausted — the excluded middle realised in natural systems.',
        'PAPER__collapse-never-happens__SECS-and-grothendieck.pdf':
            'Connects SECS fixed-point algebra to Grothendieck\u2019s unsolved problems in algebraic geometry.',
        'PAPER__existence-as-fixed-point__meta-theory.pdf':
            'The meta-theoretic wrapper: existence itself as the unique fixed point of a deterministic collapse operator.',
        /* Fine Structure Constant */
        'PAPER__fine-structure-constant__self-consistency-of-four-operator-algebra.pdf':
            'Derives \u03B1\u207B\u00B9 = 137.035999177 from self-consistency of the four-operator algebra. No fitted parameters. Matches CODATA 2018 to 0.3\u03C3.',
        'PAPER__constitutional-constant__c-emc2-algebraic-structure.pdf':
            'Shows c and E=mc\u00B2 as structural consequences of the same algebraic identity that produces \u03B1.',
        'PAPER__solve-for-pi__recovering-geometry-from-physics.pdf':
            'Recovers \u03C0 from the physics, not the other way around. Geometry as a consequence of substrate self-consistency.',
        'PAPER__alpha-precision__algebraic-vs-measured.pdf':
            'Formal statistical comparison: the algebraic value is closer to the measured value than the measurement\u2019s own uncertainty.',
        'PAPER__alpha-precision__derivation-to-validation.pdf':
            'End-to-end walkthrough from first principles to 12-digit agreement with the most precise measurement in physics.',
        'PAPER__identity-to-instrument__algebraic-alpha-as-metrological-reference.pdf':
            'Proposes using the algebraic \u03B1 as a metrological reference standard, replacing the current measurement-derived value.',
        'PAPER__alpha-time__metrological-dominoes.pdf':
            'If \u03B1 is exact, every SI-linked constant realigns. Time, mass, charge \u2014 all shift.',
        'PAPER__gravity-chain__precision-dominoes-to-G.pdf':
            'Extends the metrological chain from algebraic \u03B1 through fundamental constants to the gravitational constant G.',
        'PAPER__codata-offset__systematic-4sigma-trace.pdf':
            'Identifies a systematic 4.4\u03C3 offset in CODATA constants traced to the caesium frequency standard.',
        /* Constraint Surface */
        'PAPER__oxygen-fixed-point__wind-blood-constraint-surface.pdf':
            'Wind and blood share the same constraint surface. From atmospheric O\u2082 to arterial PaO\u2082, one topology.',
        'PAPER__mobius-strip__fixed-point-of-existence.pdf':
            'The non-orientable surface as the geometric realisation of the self-referencing substrate.',
        'PAPER__osmotic-derivation__alpha-to-sigma-chain.pdf':
            'Six links from the fine structure constant to aquaporin selectivity. \u03C3(water) \u2248 0, \u03C3(ions) = 1.0.',
        'PAPER__klein-bottle-eigenvalue__technetium-parity-tower.pdf':
            'Maps technetium\u2019s nuclear instability to a Klein bottle eigenvalue in the SECS constraint surface.',
        'PAPER__edgeless-spreadsheet__toroidal-self-reference.pdf':
            'The spreadsheet with no edges: toroidal topology as the natural geometry of self-referencing computation.',
        'PAPER__zinc-tetrahedron__shape-of-existence.pdf':
            'Zinc\u2019s tetrahedral coordination geometry as the shape that existence computes through.',
        'PAPER__z__the-periodic-table-inside-alpha.pdf':
            'The entire periodic table encoded in the algebraic structure of \u03B1. Every element numbered, none arbitrary.',
        /* Gestational Biology — Formal */
        'PAPER__pseudohypoxic-transfer__asymmetric-boundary-passage.pdf':
            'Formalises how pseudo-hypoxic signals cross the placental boundary asymmetrically, producing fetal HIF activation without maternal hypoxia.',
        'PAPER__le-chatelier-banach__oxygen-fixed-point-cross-scale.pdf':
            'Le Ch\u00E2telier\u2019s equilibrium principle and Banach\u2019s fixed-point theorem applied to the oxygen constraint across scales.',
        'PAPER__lyapunov-stability__gestational-oxygen-timing.pdf':
            'Lyapunov stability analysis of gestational development: organ vulnerability windows as regions of asymptotic instability.',
        'PAPER__umbilical-channel__information-theoretic-gestational-oxygen.pdf':
            'The umbilical cord as a Shannon channel: information-theoretic constraints on oxygen signalling to the fetus.',
        /* Synthesis Papers 1\u201311 */
        'SYNTHESIS-gestational-oxygen-timing-alignment.pdf':
            'Paper 1: OPC maturation arrest as the central mechanism linking preeclampsia to autism spectrum conditions, via the HIF-1\u03B1 pathway.',
        'SYNTHESIS-multi-organ-gestational-oxygen-timing.pdf':
            'Paper 2: Multi-organ vulnerability mapping across 10 organ systems. Each has a gestational window; when it closes, what wasn\u2019t built stays unbuilt.',
        'SYNTHESIS-treatment-convergence-oxygen-OPC-axis.pdf':
            'Paper 3: Eleven pharmacologically unrelated therapies all converge on the same two targets: O\u2082 delivery and OPC maturation.',
        'SYNTHESIS-gestational-hypoxia-cancer-predisposition.pdf':
            'Paper 4: Gestational hypoxia as the epigenetic "first hit" in cancer predisposition via Warburg metabolic pre-programming.',
        'SYNTHESIS-LMIC-neonatal-oxygen-natural-experiment.pdf':
            'Paper 5: Low- and middle-income countries as a natural experiment \u2014 neonatal oxygen availability predicts disease burden.',
        'SYNTHESIS-epigenetic-biomarkers-gestational-hypoxia.pdf':
            'Paper 6: HIF3A methylation, epigenetic clocks, and a proposed neonatal screening architecture for gestational hypoxia.',
        'SYNTHESIS-maternal-triggers-placental-anti-angiogenic-cascade.pdf':
            'Paper 7: Ten maternal triggers mapped to the placental anti-angiogenic cascade. Clinical PE is the visible tail of a distribution.',
        'SYNTHESIS-SIDS-HIF1a-autonomic-programming.pdf':
            'Paper 8: SIDS mapped to simultaneous failure of three autonomic systems \u2014 all peaking at gestational weeks 24\u201332.',
        'SYNTHESIS-sensory-integration-insular-timing-alignment.pdf':
            'Paper 9: The insular timing hypothesis \u2014 sensory integration deficits in ASD traced to insular cortex myelination timing.',
        'SYNTHESIS-developmental-trauma-oxygen-timing-convergence-NR3C1-HPA-myelination.pdf':
            'Paper 10: Where developmental trauma and gestational oxygen timing converge: NR3C1 methylation, HPA axis, and myelination.',
        'SYNTHESIS-gestational-oxygen-personality-myelination-fingerprint.pdf':
            'Paper 11: Personality as a myelination fingerprint \u2014 gestational oxygen timing as a continuous variation axis.',
        /* Extensions */
        'EXTENSION-paternal-epigenetic-germline-transmission.pdf':
            'Track 1: Paternal epigenetic transmission via retained nucleosomes, histone modifications, and small RNAs. The 4:1 male ASD ratio explained.',
        'EXTENSION-colostrum-personalised-neonatal-repair-biomarker.pdf':
            'Track 2: Colostrum as a personalised repair signal \u2014 tailored to the specific gestational insults the infant experienced.',
        'EXTENSION-environmental-exposures-placental-hypoxia.pdf':
            'Track 3: 14 environmental exposures mapped to the HIF pathway. Three categories: direct hypoxia, pseudohypoxia, and anti-angiogenic mimicry.',
        'EXTENSION-immune-activation-myelination-timing.pdf':
            'Track 4: Maternal immune activation as an alternative entry point into the same HIF pathway. All roads lead to HIF-1\u03B1 during the OPC window.',
        'EXTENSION-neonatal-oxygen-management-cord-transition.pdf':
            'Track 5: Cord clamping, FiO\u2082 targeting, caffeine, and NICU oxygen management. The birth transition as a counter-regulatory crisis.',
        'EXTENSION-trigger-mechanism-placental-cascade-initiation.pdf':
            'Track 6: Two-stage model of preeclampsia \u2014 spiral artery remodelling failure (Stage 1) and a ten-trigger taxonomy for episodic hypoxia.',
        'EXTENSION-preeclampsia-paternal-compatibility-signal.pdf':
            'Track 7: Preeclampsia as a mate-pair compatibility phenotype. Seminal fluid exposure, paternal antigen tolerance, and partner-specific PE risk.',
        /* Foundational & Master */
        'MASTER-GESTATIONAL-TIMING-EXTRACTION.pdf':
            'Complete extraction of all timing windows, vulnerability periods, and myelination timelines across the entire biological research corpus.',
        'gestational-HIF-dependency-developmental-timeline.pdf':
            'Week-by-week HIF isoform dominance, PHD counter-regulation load, and fetal iron demand through all 40 gestational weeks.',
        'gestational-impact-zones-oxygen-demand-alignment.pdf':
            'Maps injury across 10 organ systems with specific gestational windows and the stacking effect when multiple systems are open.',
        'HIF1a-counter-regulation-PHD-VHL-FIH-pathway.pdf':
            'The PHD-VHL-FIH counter-regulation machinery: how PHD2, PHD3, FIH, and VHL manage HIF-1\u03B1 levels at different oxygen thresholds.',
        'theory-perinatal-OPC-maturation-arrest-latent-white-matter-injury.pdf':
            'Unified theory of perinatal OPC maturation arrest: from molecular mechanism to latent white matter injury and "growing into deficit".',
        /* Neurodevelopmental */
        'latent-white-matter-injury-language-development.pdf':
            'The pathway from perinatal white matter injury to language delay: latent damage unmasked at the 2\u20134 year demand spike.',
        'five-area-deep-dive-ASD-white-matter-desaturation.pdf':
            'Deep dive into five brain regions where white matter desaturation drives ASD-associated functional deficits.',
        'hippocampus-white-matter-ASD-myelination.pdf':
            'Hippocampal white matter and the myelination schedule: why memory deficits and seizure vulnerability emerge from the same OPC injury.',
        'autism-regression-myelination-OPC-intervention-timing.pdf':
            'Autistic regression mapped to the myelination schedule. The 15\u201324 month regression window aligns with arcuate fasciculus demand onset.',
        /* Clinical */
        'perinatal-hypoxia-preeclampsia-autism.pdf':
            'Epidemiological and mechanistic evidence linking preeclampsia to perinatal hypoxia to autism spectrum conditions.',
        'treatment-correlation-oxygen-OPC-maturation-arrest-model.pdf':
            'Eleven existing therapies scored against the O\u2082-delivery / OPC-maturation dual-arm model. Convergence across all 11.',
        /* Synthesis & Reports */
        'PAPER__synthesis__existence-as-fixed-point__v2.pdf':
            'The unified synthesis: from algebraic fixed points through physics, biology, and computation. Version 2.',
        'PAPER__the-story__how-a-substrate-became-a-theory-of-everything.pdf':
            'The narrative arc \u2014 how a deterministic observation substrate became a framework touching every domain of science.',
        'PAPER__structural-age-regression__null-result-at-scale.pdf':
            '9,925 repositories stress-tested. The substrate\u2019s structural age regression returns null across all \u2014 a validation by adversarial absence.',
        'PAPER__angelman-hif__ubiquitin-severity-axis.pdf':
            'Angelman syndrome reframed through the HIF-1\u03B1/UBE3A ubiquitin axis: severity as a function of oxygen-dependent proteasomal load.'
    };

    function getAbstract(href) {
        if (!href) return '';
        for (var key in abstracts) {
            if (href.indexOf(key) !== -1) return abstracts[key];
        }
        return '';
    }

    document.addEventListener('DOMContentLoaded', function () {
        var cards = document.querySelectorAll('.paper-card');
        if (!cards.length) return;

        // Inject PDF badges
        cards.forEach(function (card) {
            var badge = document.createElement('span');
            badge.className = 'paper-badge';
            badge.textContent = 'PDF';
            card.appendChild(badge);
        });

        // Build modal once
        var modal = document.createElement('div');
        modal.className = 'paper-modal';
        modal.innerHTML =
            '<div class="paper-modal-backdrop"></div>' +
            '<div class="paper-modal-content">' +
            '<button class="paper-modal-close" aria-label="Close">&times;</button>' +
            '<h3 class="paper-modal-title"></h3>' +
            '<p class="paper-modal-abstract"></p>' +
            '<div class="paper-modal-actions">' +
            '<a class="paper-modal-download" href="#" target="_blank" rel="noopener noreferrer">' +
            '<i class="fa fa-download"></i> Download PDF</a>' +
            '</div></div>';
        document.body.appendChild(modal);

        var titleEl = modal.querySelector('.paper-modal-title');
        var abstractEl = modal.querySelector('.paper-modal-abstract');
        var downloadEl = modal.querySelector('.paper-modal-download');
        var backdrop = modal.querySelector('.paper-modal-backdrop');
        var closeBtn = modal.querySelector('.paper-modal-close');

        function open(href, title, abstract) {
            titleEl.textContent = title;
            if (abstract) {
                abstractEl.textContent = abstract;
                abstractEl.style.display = '';
            } else {
                abstractEl.style.display = 'none';
            }
            downloadEl.href = href;
            modal.classList.add('active');
        }

        function close() { modal.classList.remove('active'); }

        // Track downloads via GA4
        downloadEl.addEventListener('click', function () {
            var href = downloadEl.href || '';
            var filename = href.split('/').pop() || href;
            if (typeof gtag === 'function') {
                gtag('event', 'pdf_download', {
                    event_category: 'research',
                    event_label: filename,
                    file_url: href
                });
            }
        });

        cards.forEach(function (card) {
            card.addEventListener('click', function (e) {
                e.preventDefault();
                var href = card.getAttribute('href') || card.getAttribute('data-href');
                var title = card.querySelector('.paper-title').textContent;
                var abstract = card.getAttribute('data-abstract') || getAbstract(href);
                open(href, title, abstract);
            });
        });

        backdrop.addEventListener('click', close);
        closeBtn.addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });

        // Mobile nav toggle (replaces per-page jQuery handler)
        document.addEventListener('click', function (e) {
            var toggle = e.target.closest('.toggle-nav');
            if (!toggle) return;
            e.preventDefault();
            var menu = document.querySelector('.menu-responsive');
            if (menu) {
                menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
            }
        });
    });

})(window);
