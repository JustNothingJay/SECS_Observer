/**
 * Vertical compliance proof modals — used on verticals.html
 */
(function () {
    var proofs = {
        fintech: {
            title: 'Fintech',
            reg: 'MiFID II (Art. 25(6)) · SOX',
            standard: 'MiFID II Art. 25(6) requires full audit trail of every investment decision, including the data that drove it. SOX mandates tamper-evident financial records with deterministic reproducibility.',
            tested: [
                'Two-layer admissibility gate: constitutional (α₀) AND adaptor-specific (αᵥ) must both pass',
                'Live event validation: trade decision evt-20260224-00042 (AAPL BUY 500 @ 187.42) processed through full collapse pipeline',
                'HMAC-SHA256 governance signature verified on certificate',
                'Deterministic replay confirmed: identical input produces identical output via SubstrateClock seeding',
                'anomalyThreshold: 5 (2× tighter than default 10), severeDriftMagnitude: 0.7'
            ],
            proven: 'MiFID compliance is structural, not configurational. The two-layer admissibility function (α₀ ∧ αᵥ) enforces audit requirements as mathematical axioms loaded at boot. Five identity fields (userId, accountId, email, name, deviceId) are constitutionally blocked — no trade decision carries personal data into the governance layer.',
            closure: 'Certificate issued by SECS-SOVEREIGN with HMAC-SHA256 timing-safe verification. Constitutional bounds are immutable at runtime. Every decision is replayable for regulatory audit 5+ years later with identical output.'
        },
        healthcare: {
            title: 'Healthcare',
            reg: 'HIPAA (PHI Protection) · FDA 21 CFR Part 11',
            standard: 'HIPAA requires Protected Health Information to never enter decision-making systems without structural safeguards. FDA 21 CFR Part 11 requires electronic records to have complete, tamper-evident audit trails with flat record structures.',
            tested: [
                'PHI guard enforced as custom predicate: blocks patientName, mrn, dob, ssn, address, insuranceId at governance gate',
                'FDA audit trail predicate: protocolId and complianceStatus both mandatory or event rejected',
                'Live event: MRI scan evt-20260301-scan-0087, confidence 0.94, follow-up decision traced',
                'maxDepth: 1 (flat metadata) satisfies CFR Part 11 audit simplicity requirement',
                'anomalyThreshold: 3 (3× tighter than default) for early clinical anomaly detection'
            ],
            proven: 'HIPAA PHI fields are blocked by constitutional predicate in addition to the standard 13-field identity block. FDA audit simplicity enforced by maxDepth:1 (flat). No patient identity enters the governance layer. Certificate explicitly lists hipaa-phi-guard and fda-audit-trail as irrevocable invariants.',
            closure: 'HMAC-signed governance trail. Replayed 5+ years later produces identical output. anomalyThreshold 3 and severeDriftMagnitude 0.5 prevent drifting models from affecting clinical decisions. vetoFreqThreshold 2 triggers immediate escalation — patient outcomes are non-negotiable.'
        },
        defence: {
            title: 'Defence',
            reg: 'NATO STANAG 4586 · MIL-STD-882E',
            standard: 'NATO STANAG 4586 governs unmanned systems Rules of Engagement (ROE) and requires human oversight of lethal classifications. MIL-STD-882E mandates hazard analysis for safety-critical military systems.',
            tested: [
                'Human-in-the-loop predicate: HOSTILE classification + humanOverrideStatus=NONE → unconditional REJECT',
                'ROE compliance predicate: rulesOfEngagement + missionPhase both mandatory or event blocked',
                'Live event: targeting decision evt-20260301-sensor-1142, HOSTILE, confidence 0.97, human override ACTIVE',
                'anomalyThreshold: 2 (maximum sensitivity), severeDriftMagnitude: 0.3 (minimal drift tolerance)',
                'vetoFreqThreshold: 1 — single veto triggers instant escalation'
            ],
            proven: 'Lethal engagement classifications structurally require human override — not a policy preference, a mathematical axiom in the admissibility function. No operator identity permitted (operatorName, unitId, personnelId, clearanceId, deviceId all blocked). ROE traceability mandatory at every decision point.',
            closure: 'This is the lethal domain. HOSTILE + no human override = unconditional rejection. No configuration change, environment variable, or code modification can bypass the human-in-the-loop predicate. It is loaded at boot and immutable at runtime.'
        },
        insurance: {
            title: 'Insurance',
            reg: 'Solvency II · IDD (Insurance Distribution Directive)',
            standard: 'Solvency II requires regulatory capital compliance with full governance audit trail. IDD mandates transparency in insurance distribution with jurisdiction tracking.',
            tested: [
                'Solvency II audit predicate: complianceFlag + regulatoryJurisdiction both mandatory or claim rejected',
                'Negative claim guard: rejects negative claim amounts structurally at governance gate',
                'Live event: claim underwriting evt-20260301-claim-3201 (AUTO, $12,500 claim, CLEAR fraud indicator)',
                'anomalyThreshold: 4 (2.5× tighter than default) for underwriting precision',
                'HMAC-signed governance trail with deterministic replay verified'
            ],
            proven: 'Solvency II audit requirements are structural predicates, not compliance checkboxes. Regulatory jurisdiction tracking is mandatory — no claim processed without it. Negative amounts blocked at governance gate. Identity-free: no policyholderName, policyNumber, email, phone, or accountId permitted.',
            closure: 'severeDriftMagnitude 0.6 ensures containment before model drift affects premium calculations. Every governance decision is replayable for regulatory audit. The constraint surface enforces Solvency II compliance as physics, not policy.'
        },
        legal: {
            title: 'Legal',
            status: 'Adaptor-ready',
            reg: 'EU AI Act (Art. 14) · ECHR Art. 6',
            standard: 'EU AI Act Art. 14 requires transparency and human oversight in high-risk AI systems. ECHR Art. 6 guarantees the right to a fair trial, requiring jurisdiction clarity and auditable decision processes.',
            tested: [
                'EU AI Act transparency predicate: transparencyFlag + humanReviewStatus both mandatory for high-risk systems',
                'Jurisdiction predicate: jurisdictionCode + caseType both mandatory or event rejected',
                'Live event: judicial case evt-20260301-case-7744 (CRIMINAL, German jurisdiction, HIGH severity, human review COMPLETED)',
                'maxDepth: 1 (flat metadata) for maximum judicial review auditability',
                'anomalyThreshold: 3, severeDriftMagnitude: 0.4 — containment before drift affects justice outcomes'
            ],
            proven: 'Fundamental rights domain. EU AI Act Art. 14 transparency enforced as irrevocable structural predicate. ECHR Art. 6 jurisdiction traceability enforced via mandatory jurisdictionCode + caseType. maxDepth:1 ensures every decision is auditable at the simplest level. No defendant or plaintiff identity enters the governance layer.',
            closure: 'vetoFreqThreshold 2 triggers rapid escalation — fundamental rights are at stake. Certificate forbids defendantName, plaintiffName, caseNumber, ssn, email. HMAC-signed, replayable for appellate review.'
        },
        energy: {
            title: 'Energy',
            reg: 'NERC CIP · IEC 62443',
            standard: 'NERC CIP mandates cybersecurity standards for electric grid critical infrastructure. IEC 62443 requires industrial control system security with audit trails.',
            tested: [
                'NERC CIP audit predicate: complianceFlag + EMERGENCY load → incidentRef mandatory or event rejected',
                'Safety margin guard: zero or negative safetyMargin triggers structural block requiring human review',
                'Live event: grid control evt-20260301-grid-0923 (ELEVATED load, ZONE-NE-7, safetyMargin 15.2, COMPLIANT)',
                'anomalyThreshold: 2 (critical infrastructure earliest detection)',
                'vetoFreqThreshold: 1 — single veto triggers immediate escalation (cascading failure risk)'
            ],
            proven: 'Critical infrastructure domain: cascading failures mandate structural safety enforcement. NERC CIP audit requirements are mandatory custom predicates. IEC 62443 audit compliance enforced via HMAC governance. safetyMargin field accepted only if positive — a structural guard, not a validation rule.',
            closure: 'severeDriftMagnitude 0.3 prevents grid instability from cascading. No operator name, facility ID, or access badge identity enters the governance layer. Every governance decision is deterministically replayable for regulatory investigation.'
        },
        automotive: {
            title: 'Automotive',
            reg: 'ISO 26262 (ASIL) · SOTIF (ISO 21448)',
            standard: 'ISO 26262 requires functional safety classification (ASIL A–D) for all road vehicle systems. SOTIF ISO 21448 addresses safety of the intended functionality under unknown or unsafe conditions.',
            tested: [
                'ISO 26262 ASIL predicate: safetyIntegrityLevel must be ASIL_A|B|C|D or event rejected',
                'SOTIF unknown/unsafe guard: UNKNOWN_UNSAFE condition → emergencyBraking evaluation mandatory or event blocked',
                'Live event: path-planning evt-20260301-av-planner-4401 (ASIL_D, confidence 0.98, obstacle detected, safe condition)',
                'severeDriftMagnitude: 0.2 — LOWEST across all 10 verticals (safety-critical domain)',
                'vetoFreqThreshold: 1 = single veto triggers safe stop'
            ],
            proven: 'ISO 26262 ASIL classification enforced as custom predicate — no bypass. SOTIF unknown/unsafe conditions structurally require emergency braking evaluation via admissibility function. severeDriftMagnitude 0.2 is the globally lowest threshold across all verticals, attesting to the safety-criticality of the domain.',
            closure: 'No driver name, vehicle owner, license plate, or VIN enters the governance layer. ASIL classification is not optional — it is a mathematical precondition for admissibility. UNKNOWN_UNSAFE + no emergency braking = unconditional rejection.'
        },
        cybersecurity: {
            title: 'Cybersecurity',
            reg: 'NIST CSF 2.0 · SOC 2 Type II',
            standard: 'NIST Cybersecurity Framework 2.0 provides governance structure for cybersecurity risk management. SOC 2 Type II requires demonstrated controls over technology systems with evidence of operational effectiveness.',
            tested: [
                'NIST CSF compliance predicate: complianceFlag + CRITICAL severity → MITRE ATT&CK ID reference mandatory',
                'Escalation coherence predicate: CRITICAL severity blocks LOG|ALERT escalation actions (forces proportional response)',
                'Live event: threat escalation evt-20260301-soc-alert-8891 (LATERAL_MOVEMENT, HIGH severity, confidence 0.87, INVESTIGATE)',
                'anomalyThreshold: 3 for SOC early detection',
                'HMAC-signed governance with deterministic replay'
            ],
            proven: 'NIST CSF and SOC 2 compliance enforced via custom predicates that cannot be disabled. Escalation coherence rule prevents false negatives: a CRITICAL threat level cannot result in a weak escalation action (LOG or ALERT). This is structural logic, not configuration.',
            closure: 'Certificate lists nist-csf-compliance and escalation-coherence as irrevocable invariants. No analyst name, user identity, email, or IP address enters the governance layer. Every threat decision is replayable with identical output.'
        },
        supplychain: {
            title: 'Supply Chain',
            reg: 'EU CSRD · CSDDD · Basel III',
            standard: 'EU CSRD requires corporate sustainability reporting with due diligence evidence. CSDDD mandates supplier assessment. Basel III requires trade finance compliance.',
            tested: [
                'CSDDD due diligence predicate: dueDiligenceRef + complianceStatus both mandatory or event rejected',
                'Sanctions block guard: sanctionsCheck=BLOCKED triggers unconditional rejection (no override)',
                'Live event: risk assessment evt-20260301-scm-risk-1107 (TIER_2, ENVIRONMENTAL ESG, risk 0.35, CLEAR sanctions)',
                'anomalyThreshold: 5 (supply chain is a slower-moving domain)',
                'regulatoryJurisdiction tracking mandatory'
            ],
            proven: 'EU CSRD/CSDDD due diligence requirements are structural gates — no supplier risk assessment is possible without a dueDiligenceRef. Sanctions blocking is automatic: BLOCKED status triggers unconditional rejection with no override path. No supplier identity enters the governance layer.',
            closure: 'severeDriftMagnitude 0.6 ensures containment before supplier risk misclassification. Certificate forbids supplierName, contactPerson, email, phone, accountId. Every ESG assessment is deterministically replayable.'
        },
        edtech: {
            title: 'EdTech',
            status: 'Adaptor-ready',
            reg: 'FERPA · COPPA · EU GDPR (Art. 22)',
            standard: 'FERPA protects student education records. COPPA requires parental consent for under-13 data collection. EU GDPR Art. 22 restricts automated decision-making on children.',
            tested: [
                'FERPA guard predicate: blocks studentName, studentId, parentName, schoolName, dateOfBirth at governance gate',
                'COPPA age guard: K-5 grade levels → complianceStatus flag mandatory or event rejected',
                'Live event: learning path evt-20260301-learn-path-2204 (Grade 6-8, MATH, adaptive assessment, intervention suggested)',
                'maxDepth: 1, maxSizeBytes: 1024 — MOST RESTRICTIVE configuration across all 10 verticals',
                'anomalyThreshold: 4 for student-facing systems'
            ],
            proven: 'FERPA and COPPA enforced as irrevocable structural predicates. Age-specific compliance: K-5 students require complianceStatus flag (COPPA under-13 protection). maxDepth:1 + maxSizeBytes:1024 is the globally most restrictive configuration, attesting to student privacy priority.',
            closure: 'Certificate forbids studentName, studentId, parentName, email, deviceId. No student identity enters the decision layer. severeDriftMagnitude 0.6 prevents model drift from misclassifying student performance. Every learning path recommendation is deterministically replayable.'
        },
        governedai: {
            title: 'Governed AI',
            reg: 'Enterprise AI management — structured guardrails and drift governance',
            standard: 'No regulator has defined a standard for AI agent governance yet. SECS provides a structured layer for enterprises managing AI products: guardrail scripts that run at critical decision points, agent drift handover processes, and envelope-level auditability. The layout, structure, and execution timing are the value — the scripts themselves can be modified to each customer’s use case or deployed as-is.',
            tested: [
                'Guardrail assessment: AI agent products evaluated against up to 100 configurable rules covering admissibility, identity, drift, and action constraints',
                'Adaptor provisioning: operator defines the constraint surface, certified adaptor deployed with enforceable bounds per AI partner',
                'Kill switch: operator can revoke any adaptor certificate instantly — connection terminates, no graceful degradation',
                'Reasoning bound rules: configurable constraints such as reasoningTime > 30s → actionConstraints where DEL ALLOWED = BLOCK',
                'Envelope replay: when an agent deletes a file, moves data, or triggers an anomaly — every envelope in the execution chain is replayable, showing which system acted, in what sequence, under what authority',
                'Agent drift handover: structured process for detecting when AI behaviour drifts outside the certified surface, with automated flagging and operator escalation',
                'Authority chain tracing: full provenance from operator configuration → adaptor certificate → admissibility gate → collapse decision → outcome'
            ],
            proven: 'Others are building AI management tooling. Many are ahead. But most are not taking the time to ensure the layout is correct, the structure is sound, and the guardrail scripts run at the critical moments. SECS provides that structural discipline: scripts that execute at the right time, drift processes that hand off cleanly, and envelope-level replay that answers the question “why did the agent do that?” The gap is not capability — it is rigour.',
            closure: 'This vertical operates as an onboarding service or a deploy-as-is toolkit. An enterprise runs the guardrail assessment against their AI products, gets a gap report, and implements the adaptor configuration that closes those gaps. Every AI partner gets a certified adaptor, a kill switch, drift monitoring, and a full replay trail. The scripts are modifiable. The structure is not.'
        }
    };

    function initVerticalProofs() {
        var overlay = document.getElementById('proofOverlay');
        var content = document.getElementById('proofContent');
        var closeBtn = document.getElementById('proofClose');
        if (!overlay || !content) return;

        function openProof(key) {
            var d = proofs[key];
            if (!d) return;
            var h = '<h4>' + d.title + '</h4>';
            h += '<div class="proof-reg">' + d.reg + '</div>';
            h += '<div class="proof-block"><h5>Standard Applied</h5><p>' + d.standard + '</p></div>';
            h += '<div class="proof-block"><h5>How It Was Tested</h5><ul>';
            for (var i = 0; i < d.tested.length; i++) {
                h += '<li>' + d.tested[i] + '</li>';
            }
            h += '</ul></div>';
            h += '<div class="proof-block"><h5>Why ' + (d.status || 'Proven') + '</h5><p>' + d.proven + '</p></div>';
            h += '<div class="proof-closure"><p><strong>Proof Closure:</strong> ' + d.closure + '</p></div>';
            content.innerHTML = h;
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeProof() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        closeBtn.addEventListener('click', closeProof);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeProof();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeProof();
        });

        var rows = document.querySelectorAll('tr[data-proof]');
        for (var i = 0; i < rows.length; i++) {
            rows[i].addEventListener('click', function () {
                openProof(this.getAttribute('data-proof'));
            });
        }

        var hash = (location.hash || '').replace(/^#/, '');
        if (hash && proofs[hash]) {
            openProof(hash);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVerticalProofs);
    } else {
        initVerticalProofs();
    }
})();