(function () {
    'use strict';

    var verticals = {
        'labour-hire': {
            label: 'Labour Hire',
            icon: 'fa-solid fa-people-group',
            kicker: 'Multi-party commercial governance',
            subtitle: 'A working dual-portal product: clients request staff, agencies fill, both parties dual-approve timesheets and invoices.',
            summary: 'Labour hire fails when client and agency keep separate spreadsheets for the same shift. SECS Agconn treats timesheet lines as the single source of truth, enforces G1 (agency holds candidate identity) and G2 (client overlays nominations and Optimal Fit), and refuses invoice issue without dual signature. This vertical has a working local app — not only a narrative demo.',
            missionTitle: 'Example Mission: Warehouse roster week → dual-approved invoice',
            missionSummary: 'Demo Warehouse requests Pick/Pack coverage. Demo Labour Hire fills candidates, records worked shifts, submits the period; the client approves; agency drafts and both parties sign the invoice; lines lock.',
            workingApp: {
                status: 'Working product (separate deploy)',
                href: 'apps.html',
                label: 'See Apps catalogue',
                note: 'Runtime is not hosted on this static site. Private product repo; invite-only or local demo when offered.'
            },
            meta: [
                { label: 'Adaptor pressure', value: 'Dual approval + locked periods + linked tenancy' },
                { label: 'Operator question', value: 'Can both parties prove the same hours and signature path?' },
                { label: 'Failure posture', value: 'Invoice issue without both signatures is structurally refused' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Client roster/quick/training requests enter as staff-request lines (N/P/C/T grid).' },
                { phase: '02 · Accept', detail: 'Only linked client↔agency pairs and role-scoped sessions may mutate; org identity comes from the session, not the body.' },
                { phase: '03 · Route', detail: 'Agency fill creates timesheet lines (scheduled); client may nominate (G2) but only agency assigns (G1).' },
                { phase: '04 · React', detail: 'Attendance O/L/N/F → worked → agency submit → client approve period under domain state machine.' },
                { phase: '05 · Emit Proof', detail: 'Invoice from approved lines; agency then client sign; HMAC-durable governance events; optional Xero CSV export.' },
                { phase: '06 · Extinguish / Lock', detail: 'Issued invoice locks timesheet lines; locked lines refuse further mutation.' },
                { phase: '07 · Observer boundary', detail: 'Read-only /api/observer/snapshot exposes health and audit counts without writing domain tables.' }
            ],
            gains: [
                { title: 'Shared mirror', detail: 'One timesheet line for client and agency — not two exports that never match.' },
                { title: 'Dual commercial sign-off', detail: 'Issue requires agencySigned and clientSigned (labour-hire-0001).' },
                { title: 'Skills + Optimal Fit', detail: 'Placement rules and preferred-worker boosts are first-class and audited.' },
                { title: 'Working product, not a slide', detail: 'Multi-user portal, durable SQLite, scrypt auth, CSV import/export.' }
            ],
            config: [
                { name: 'dual-approval-before-issue', value: 'Required', meaning: 'invoice.issue refused without both signatures.' },
                { name: 'locked-period-immutable', value: 'Required', meaning: 'timesheet.line.mutate blocked when complianceFlag/status is locked.' },
                { name: 'allowedSignals', value: 'Closed set', meaning: 'entityId, lineId, hours, rateCents, transition, … only.' },
                { name: 'G1 / G2', value: 'Agency / Client', meaning: 'Agency owns candidate shell; client overlays cannot fill.' }
            ],
            incident: [
                'Agency attempts to issue an invoice after generating draft without client signature.',
                'Domain contract + adaptor predicate refuse issue; governance records the path.',
                'Both parties sign; lines lock; Xero CSV can be exported for the accounting system.'
            ],
            regulators: ['AU labour-hire licensing context', 'Payroll / invoice dual control', 'Privacy — G1 agency holds worker identity']
        },
        robotics: {
            label: 'Robotics',
            icon: 'fa-solid fa-robot',
            kicker: 'Safety-critical automation',
            subtitle: 'A governed control surface for robots that must either execute safely or veto before motion.',
            summary: 'SECS Sovereign is unusually strong in robotics because the whole substrate is designed around deterministic replay, bounded execution, exhaustive veto, and return-to-purity after each cycle. That directly attacks the failure classes that make long-duration robots hard to debug, certify, and trust.',
            missionTitle: 'Example Mission: Industrial robotic arm in a mixed human workcell',
            missionSummary: 'A robotic arm receives depth, torque, and tool-state signals while handing parts across a human-shared boundary. The system must maintain throughput without ever allowing stale state, unsafe motion, or irreproducible failures.',
            meta: [
                { label: 'Adaptor pressure', value: 'Motion safety + deterministic replay' },
                { label: 'Operator question', value: 'Can the same 24-hour mission be replayed bit-for-bit for certification or incident review?' },
                { label: 'Failure posture', value: 'Unsafe motion is vetoed before actuation, not patched after the fact' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Depth cameras, joint encoders, torque sensors, and work-order intent enter the substrate as a governed observation set for one control cycle.' },
                { phase: '02 · Accept', detail: 'The perimeter checks latency, burst rate, stale packets, and command admissibility before the robot is even allowed to consider motion.' },
                { phase: '03 · Route', detail: 'Signals route into the correct motion, safety, and tool-control paths without carrying hidden personality or leftover mission state from the last cycle.' },
                { phase: '04 · React', detail: 'The robot computes its next safe movement under constitutional envelopes: joint limits, no-go zones, payload bounds, and actuator response windows.' },
                { phase: '05 · Extinguish', detail: 'Transient state is collapsed out. No ghost variables, stale sensor artifacts, or adaptive leftovers are allowed to persist across the boundary.' },
                { phase: '06 · Emit Proof', detail: 'The substrate emits a proof token and audit trail for the exact sensor frame, command, and veto or execution decision that occurred.' },
                { phase: '07 · Reset to Purity', detail: 'The next cycle begins from a governed clean baseline. Long-duration drift has to re-enter through observable signals, not hidden residue.' }
            ],
            gains: [
                { title: 'Deterministic replay', detail: 'A rare actuator fault can be replayed exactly instead of guessed from logs and scheduler timing.' },
                { title: 'No long-term drift accumulation', detail: 'SECS collapses every cycle back to a governed baseline instead of letting state quietly wander for hours.' },
                { title: 'Exhaustive veto', detail: 'Unsafe commands are structurally impossible once they violate the motion envelope or timing surface.' },
                { title: 'Bounded adaptation', detail: 'The robot can adapt to wear, payload change, or terrain shift without escaping its constitutional limits.' },
                { title: 'Fleet fungibility', detail: 'Robot modules and whole fleets remain interchangeable rather than growing identity debt and brittle coordination rules.' },
                { title: 'Forensic traceability', detail: 'Every actuator decision becomes an inspectable proof path, which simplifies liability, maintenance, and certification review.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '2', meaning: 'Tight anomaly tolerance because a small sensor inconsistency near humans is safety-relevant.' },
                { name: 'severeDriftMagnitude', value: '0.2', meaning: 'Very low drift allowance to detect calibration creep or control-surface mismatch early.' },
                { name: 'vetoFreqThreshold', value: '1', meaning: 'Repeated vetoes are treated as a serious system condition, not background noise.' },
                { name: 'jointLimitSurface', value: 'Immutable envelope', meaning: 'No control path is allowed to exceed mechanically safe motion bounds.' },
                { name: 'forbiddenZoneMap', value: 'Human-shared workspace exclusion', meaning: 'No-go zones are enforced before motion planning reaches the actuator layer.' },
                { name: 'actuatorLatencyBound', value: 'Cycle-locked', meaning: 'Commands that arrive outside the acceptable control window are structurally rejected.' }
            ],
            incident: [
                'A depth frame is delayed while the arm is preparing to swing across a human-shared boundary.',
                'The stale packet pushes the control cycle outside the admissible latency envelope.',
                'SECS vetoes the movement before partial execution rather than trying to correct mid-motion.',
                'The operator receives the proof token, veto reason, and exact cycle evidence for replay.',
                'Engineering replays the mission deterministically on desktop and sees the same stale-frame sequence with no ambiguity.'
            ],
            regulators: ['ISO 10218', 'IEC 61508', 'UL 4600', 'NASA-style mission assurance', 'Long-duration field robotics']
        },
        healthcare: {
            label: 'Healthcare',
            icon: 'fa fa-heartbeat',
            kicker: 'Clinical governance',
            subtitle: 'A governed decision path for clinical workflows where identity-free enforcement and replayability matter.',
            summary: 'Healthcare workflows often fail when recommendation logic, operator override, and audit history drift apart. SECS keeps the observation path identity-free, the release path replayable, and the veto path explicit.',
            missionTitle: 'Example Mission: Imaging follow-up triage',
            missionSummary: 'An imaging workflow flags a study for escalation while proving that no patient-identifiable data entered the governance decision.',
            meta: [
                { label: 'Adaptor pressure', value: 'Clinical traceability + no identity leakage' },
                { label: 'Operator question', value: 'Can the escalation be replayed without exposing patient identity?' },
                { label: 'Failure posture', value: 'Improperly formed or overbroad escalation is vetoed before release' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Scan metadata, protocol state, severity scores, and follow-up rules enter as the admissible signal set.' },
                { phase: '02 · Accept', detail: 'Identity-bearing fields are rejected up front; only the constitutional clinical signals are admitted.' },
                { phase: '03 · Route', detail: 'The observation routes through the medical adaptor constraint surface rather than an unconstrained inference chain.' },
                { phase: '04 · React', detail: 'The system determines whether the study can proceed, must hold, or requires escalated review.' },
                { phase: '05 · Emit Proof', detail: 'An audit artifact records the exact reason for escalation and the admissible fields that produced it.' }
            ],
            gains: [
                { title: 'Identity-free governance', detail: 'Clinical governance can be explained without disclosing patient identity.' },
                { title: 'Reproducible review', detail: 'A regulator can replay the same admissible evidence path instead of trusting a narrative summary.' },
                { title: 'Bounded release', detail: 'Only constitutionally allowed fields participate in the escalation path.' },
                { title: 'Tamper evidence', detail: 'Governance signatures make post-hoc adjustment visible.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '3', meaning: 'Sensitive to unusual escalation spikes without forcing constant holds.' },
                { name: 'severeDriftMagnitude', value: '0.5', meaning: 'Moderate tolerance before the clinical decision surface is considered unstable.' },
                { name: 'vetoFreqThreshold', value: '2', meaning: 'Repeated vetoes trigger governance review.' },
                { name: 'identityFieldBan', value: 'Hard enforced', meaning: 'Patient-identifiable fields are structurally excluded from the governed path.' }
            ],
            incident: [
                'A study is escalated with an unexpected metadata combination.',
                'The adaptor confirms the decision came only from admitted clinical fields.',
                'Audit review replays the exact escalation logic and verifies no identity leak occurred.'
            ],
            regulators: ['HIPAA', 'FDA 21 CFR Part 11', 'Clinical audit trails']
        },
        fintech: {
            label: 'Fintech',
            icon: 'fa fa-line-chart',
            kicker: 'Replayable decisioning',
            subtitle: 'Governed trade and risk workflows where reproducibility matters as much as speed.',
            summary: 'Fintech systems break trust when trade logic cannot be replayed or when risk escalation depends on hidden state. SECS keeps the decision path deterministic and reviewable.',
            missionTitle: 'Example Mission: Escalated trade recommendation',
            missionSummary: 'A model recommends a trade, the adaptor checks admissibility, and governance decides whether the action can release or must hold for review.',
            meta: [
                { label: 'Adaptor pressure', value: 'Determinism under market volatility' },
                { label: 'Operator question', value: 'Would the same input produce the same recommendation again?' },
                { label: 'Failure posture', value: 'Non-replayable or out-of-envelope recommendations hold' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Venue state, instrument, side, strategy tag, and risk bucket enter as the admissible observation frame.' },
                { phase: '02 · Accept', detail: 'The perimeter rejects malformed or policy-breaking request surfaces before recommendation logic runs.' },
                { phase: '03 · React', detail: 'The adaptor computes whether the trade can release, must escalate, or must veto.' },
                { phase: '04 · Emit Proof', detail: 'The resulting action produces a replayable trail for compliance and internal review.' }
            ],
            gains: [
                { title: 'Reproducible trade path', detail: 'The same market observation yields the same governed recommendation.' },
                { title: 'Explicit escalation surface', detail: 'High-risk actions are held intentionally rather than drifting into release.' },
                { title: 'Tamper-evident review', detail: 'Audit can verify what happened from proof artifacts instead of email archaeology.' },
                { title: 'Bounded adaptation', detail: 'Adaptive logic cannot outrun the constitutional envelope.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '5', meaning: 'Broader volatility tolerance before anomaly handling engages.' },
                { name: 'severeDriftMagnitude', value: '0.7', meaning: 'Allows normal market turbulence while still detecting surface instability.' },
                { name: 'vetoFreqThreshold', value: '3', meaning: 'Frequent vetoes indicate systemic mismatch rather than isolated trade noise.' }
            ],
            incident: [
                'A recommendation arrives under high-risk conditions without the required escalation flag.',
                'The adaptor holds the action instead of allowing a soft-fail release.',
                'Compliance replays the same request and receives the same hold decision.'
            ],
            regulators: ['MiFID II', 'SOX', 'EMIR', 'Internal model governance']
        },
        defence: {
            label: 'Defence',
            icon: 'fa fa-fighter-jet',
            kicker: 'Mission authority under constraint',
            subtitle: 'Governed command routing for targeting, mission state, and engagement reviews.',
            summary: 'High-stakes defence workflows fail catastrophically when timing, authority, and state drift apart. SECS keeps command admissibility and proof paths explicit.',
            missionTitle: 'Example Mission: Autonomous targeting recommendation review',
            missionSummary: 'A system recommends an engagement path, but the adaptor must enforce phase, override, and authority surfaces before anything can proceed.',
            meta: [
                { label: 'Adaptor pressure', value: 'Authority, timing, and proof integrity' },
                { label: 'Operator question', value: 'Can the chain of decision be proven untampered?' },
                { label: 'Failure posture', value: 'Out-of-phase or unauthorised actions are vetoed structurally' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Sensor type, classification state, rules of engagement, and mission phase enter as the controlled observation frame.' },
                { phase: '02 · Accept', detail: 'The surface rejects commands that do not match the current phase and authority envelope.' },
                { phase: '03 · React', detail: 'The adaptor determines whether the recommendation is admissible, must hold, or must be vetoed.' },
                { phase: '04 · Emit Proof', detail: 'The action path produces a chain-of-command proof artifact for later review.' }
            ],
            gains: [
                { title: 'Authority enforcement', detail: 'Actions cannot slip through the wrong mission phase or override status.' },
                { title: 'Clean replay', detail: 'Decision review becomes a deterministic reconstruction, not narrative reconstruction.' },
                { title: 'Zero hidden drift', detail: 'Transient state does not persist as ghost mission context.' },
                { title: 'Structural veto', detail: 'Unsafe or unauthorised engagement paths fail before execution.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '2', meaning: 'Small anomalies matter in command authority paths.' },
                { name: 'severeDriftMagnitude', value: '0.3', meaning: 'Low tolerance for chain drift before forced review.' },
                { name: 'vetoFreqThreshold', value: '1', meaning: 'Repeated vetoes immediately signal command-surface instability.' }
            ],
            incident: [
                'A hostile classification arrives without the necessary human override state.',
                'The adaptor vetoes the recommendation before it becomes an executable path.',
                'Audit review gets the same veto result under replay.'
            ],
            regulators: ['NATO STANAG 4586', 'MIL-STD-882E', 'Mission assurance review']
        },
        energy: {
            label: 'Energy',
            icon: 'fa fa-bolt',
            kicker: 'Grid stability governance',
            subtitle: 'A governed control surface for load balancing, anomaly escalation, and safe operating envelopes.',
            summary: 'Energy infrastructure needs fast reaction without letting operational turbulence become governance drift. SECS separates observation, veto, and release cleanly.',
            missionTitle: 'Example Mission: Grid load rebalancing under severe demand pressure',
            missionSummary: 'A grid controller handles spikes, anomalies, and load-shed options while proving the control chain was not compromised.',
            meta: [
                { label: 'Adaptor pressure', value: 'Grid safety + command integrity' },
                { label: 'Operator question', value: 'Can the control action be shown to come from the admissible surface only?' },
                { label: 'Failure posture', value: 'Unsafe load actions hold or veto before dispatch' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Load state, anomaly type, control action, and compliance status enter the cycle.' },
                { phase: '02 · Accept', detail: 'The perimeter rejects malformed or late control inputs before operational routing.' },
                { phase: '03 · React', detail: 'The adaptor decides whether to observe, ramp, shed, or escalate under the current load envelope.' },
                { phase: '04 · Emit Proof', detail: 'Every change in control posture produces a replayable governance trail.' }
            ],
            gains: [
                { title: 'Bounded control', detail: 'Load actions stay inside hard safety envelopes instead of operator convention.' },
                { title: 'Reproducible incidents', detail: 'Post-outage review can replay the exact control path.' },
                { title: 'Clear escalation rules', detail: 'Severe anomalies do not collapse into fuzzy operator judgment.' },
                { title: 'No silent drift', detail: 'Long-running control loops return to purity each cycle.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '2', meaning: 'Grid anomalies should trigger early attention.' },
                { name: 'severeDriftMagnitude', value: '0.3', meaning: 'Low drift tolerance before route review.' },
                { name: 'vetoFreqThreshold', value: '1', meaning: 'Repeated vetoes indicate the control surface is unstable.' }
            ],
            incident: [
                'A severe anomaly attempts to bypass standard escalation and trigger an unsafe load action.',
                'The adaptor blocks release and emits the reason as a proofable veto.',
                'Operations can replay the exact request under the same conditions.'
            ],
            regulators: ['NERC CIP', 'IEC 62443', 'Grid operations assurance']
        },
        automotive: {
            label: 'Automotive',
            icon: 'fa fa-car',
            kicker: 'Autonomy under hard envelopes',
            subtitle: 'A governed control surface for sensor fusion, driving decisions, and safety vetoes.',
            summary: 'Autonomous driving stacks fail when sensor fusion, timing, and stateful heuristics cannot be cleanly replayed. SECS turns the decision surface into something bounded and inspectable.',
            missionTitle: 'Example Mission: Lane-change recommendation with occluded sensor input',
            missionSummary: 'A vehicle considers a lane change while one sensor stream is degraded. The adaptor must prove whether the motion path is admissible, held, or vetoed.',
            meta: [
                { label: 'Adaptor pressure', value: 'Safety envelopes + replayable autonomy' },
                { label: 'Operator question', value: 'Can the driving decision be shown free of identity bias and timing drift?' },
                { label: 'Failure posture', value: 'Sensor ambiguity can veto motion before the vehicle commits' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Sensor fusion, route state, confidence levels, and safety surfaces enter one governed cycle.' },
                { phase: '02 · Accept', detail: 'The perimeter rejects late or inconsistent sensor frames rather than hiding them downstream.' },
                { phase: '03 · React', detail: 'The adaptor computes whether the maneuver is safe, should hold, or must veto.' },
                { phase: '04 · Emit Proof', detail: 'The chosen posture and evidence set are emitted for audit and replay.' }
            ],
            gains: [
                { title: 'Replayable autonomy', detail: 'Rare edge-case behavior can be reconstructed exactly.' },
                { title: 'Structural motion veto', detail: 'Unsafe lane changes fail before commitment.' },
                { title: 'No personality drift', detail: 'The vehicle does not accumulate invisible control quirks across long runs.' },
                { title: 'Certifiable evidence', detail: 'Safety review can point to hard artifacts, not opaque stack behavior.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '2', meaning: 'Tight anomaly tolerance for safety-critical motion.' },
                { name: 'severeDriftMagnitude', value: '0.2', meaning: 'Very low tolerance for route or sensor drift.' },
                { name: 'vetoFreqThreshold', value: '1', meaning: 'Repeated vetoes flag a degraded autonomy surface.' }
            ],
            incident: [
                'A lane-change candidate is generated while one sensor path is partially occluded.',
                'The adaptor sees confidence drop outside the admissible envelope and vetoes the motion.',
                'The event is replayed later with the same sensor sequence and the same decision.'
            ],
            regulators: ['ISO 26262', 'SOTIF (ISO 21448)', 'UL 4600-style autonomy review']
        },
        cybersecurity: {
            label: 'Cybersecurity',
            icon: 'fa fa-shield',
            kicker: 'Tamper-evident alert governance',
            subtitle: 'A governed alert and escalation path for security operations centers and incident response pipelines.',
            summary: 'Cybersecurity pipelines fail when alerts cannot be trusted, suppression rules become ad hoc, or the escalation path is mutable under pressure. SECS keeps the route governed and provable.',
            missionTitle: 'Example Mission: SOC telemetry escalation',
            missionSummary: 'Telemetry bursts, anomaly scores, and incident classes enter the adaptor, which determines whether an alert can release, hold, or veto.',
            meta: [
                { label: 'Adaptor pressure', value: 'Tamper-evident escalation' },
                { label: 'Operator question', value: 'Can the SOC prove the alert pipeline was not compromised?' },
                { label: 'Failure posture', value: 'Malformed or suspicious escalation paths are blocked' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Telemetry observations, anomaly bursts, and correlation state enter the governed path.' },
                { phase: '02 · Accept', detail: 'Only admitted signal types and timing envelopes are allowed forward.' },
                { phase: '03 · React', detail: 'The adaptor determines whether to emit an alert, escalate, or hold for review.' },
                { phase: '04 · Emit Proof', detail: 'The SOC receives a tamper-evident explanation of how the escalation happened.' }
            ],
            gains: [
                { title: 'Provable alert path', detail: 'Security review can verify the pipeline was not tampered with.' },
                { title: 'Replayable incidents', detail: 'Edge-case escalations can be rerun cleanly.' },
                { title: 'No ad hoc suppression drift', detail: 'The governance surface stays explicit.' },
                { title: 'Hard perimeter controls', detail: 'Burst and rate anomalies are structural, not advisory.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '3', meaning: 'Security telemetry needs early anomaly detection without constant false vetoes.' },
                { name: 'severeDriftMagnitude', value: '0.5', meaning: 'Moderate tolerance before pipeline drift is treated as severe.' },
                { name: 'vetoFreqThreshold', value: '2', meaning: 'Frequent vetoes indicate systemic alert-path instability.' }
            ],
            incident: [
                'An alert chain receives an unusual telemetry burst and an unexpected route mutation.',
                'The perimeter detects the mismatch and prevents a compromised escalation path from releasing.',
                'Security review replays the same evidence and sees the same veto outcome.'
            ],
            regulators: ['NIST CSF 2.0', 'SOC 2 Type II', 'Incident review and forensics']
        },
        edtech: {
            label: 'EdTech',
            icon: 'fa fa-graduation-cap',
            kicker: 'Identity-free adaptive instruction',
            subtitle: 'A governed recommendation surface for adaptive learning that excludes student identity from the decision path.',
            summary: 'Educational systems become opaque quickly when recommendation logic mixes pedagogy with profile identity. SECS keeps the recommendation surface limited to admissible learning signals.',
            missionTitle: 'Example Mission: Adaptive learning content recommendation',
            missionSummary: 'A learning system recommends the next content block while proving the governed output did not depend on student identity.',
            meta: [
                { label: 'Adaptor pressure', value: 'Adaptive recommendation without identity bias' },
                { label: 'Operator question', value: 'Can the parent or reviewer prove identity was excluded?' },
                { label: 'Failure posture', value: 'Improper signal use is blocked before the recommendation is emitted' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Progress state, concept mastery, and admissible interaction signals enter the cycle.' },
                { phase: '02 · Accept', detail: 'Identity-bearing or non-admitted fields are rejected immediately.' },
                { phase: '03 · React', detail: 'The adaptor recommends, holds, or vetoes the next instructional object.' },
                { phase: '04 · Emit Proof', detail: 'A proof path shows how the recommendation was bounded.' }
            ],
            gains: [
                { title: 'Identity-free output', detail: 'Recommendation quality can improve without leaking learner identity into governance.' },
                { title: 'Replayable pedagogy', detail: 'Recommendation logic becomes inspectable and rerunnable.' },
                { title: 'Bounded adaptation', detail: 'Adaptive learning stays inside constitutional limits.' },
                { title: 'Clear parent review', detail: 'The evidence surface is much easier to explain.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '4', meaning: 'Adaptive systems tolerate some behavioural variation without constant intervention.' },
                { name: 'severeDriftMagnitude', value: '0.6', meaning: 'Moderate drift allowance before recommendation review.' },
                { name: 'vetoFreqThreshold', value: '3', meaning: 'Frequent vetoes indicate a bad instructional envelope.' }
            ],
            incident: [
                'A recommendation request includes a field that should not participate in the learning decision.',
                'The adaptor rejects the surface before the content suggestion is released.',
                'The proof trail shows exactly which admission rule failed.'
            ],
            regulators: ['FERPA', 'COPPA', 'EU GDPR Art. 22']
        },
        insurance: {
            label: 'Insurance',
            icon: 'fa fa-umbrella',
            kicker: 'Governed underwriting decisions',
            subtitle: 'A replayable and bounded decision path for pricing, underwriting, and claims escalation.',
            summary: 'Insurance systems often become impossible to explain because underwriting logic, profile data, and override practices drift. SECS keeps the admissible risk surface explicit.',
            missionTitle: 'Example Mission: Underwriting recommendation',
            missionSummary: 'A pricing engine evaluates a risk surface and either releases a bounded recommendation or holds for review under governance rules.',
            meta: [
                { label: 'Adaptor pressure', value: 'Transparent risk governance' },
                { label: 'Operator question', value: 'Can the system prove which admissible factors drove the recommendation?' },
                { label: 'Failure posture', value: 'Improper or unstable risk paths hold before release' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Risk factors, product context, and admissible pricing signals enter the cycle.' },
                { phase: '02 · Accept', detail: 'The perimeter filters out forbidden or unstable decision inputs.' },
                { phase: '03 · React', detail: 'The adaptor computes release, escalation, or veto under the constitutional surface.' },
                { phase: '04 · Emit Proof', detail: 'The result becomes a replayable governance artifact.' }
            ],
            gains: [
                { title: 'Transparent pricing path', detail: 'Review can see what was allowed to shape the decision.' },
                { title: 'Replayable disputes', detail: 'A contested recommendation can be rerun under the same envelope.' },
                { title: 'Bounded override logic', detail: 'Overrides stay governable instead of becoming informal practice.' },
                { title: 'Audit-friendly proofs', detail: 'Proof artifacts simplify liability review.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '4', meaning: 'Underwriting variation needs moderate tolerance.' },
                { name: 'severeDriftMagnitude', value: '0.6', meaning: 'Large surface drift should trigger governance review.' },
                { name: 'vetoFreqThreshold', value: '3', meaning: 'Repeated vetoes suggest a malformed pricing envelope.' }
            ],
            incident: [
                'An underwriting request enters with a suspicious combination of factors outside the governed surface.',
                'The adaptor blocks release and records the exact veto condition.',
                'The insurer can replay the same request during dispute review.'
            ],
            regulators: ['Solvency II', 'IDD', 'Internal underwriting governance']
        },
        legal: {
            label: 'Legal',
            icon: 'fa fa-gavel',
            kicker: 'Governed recommendation boundaries',
            subtitle: 'A bounded advisory surface for legal or judicial recommendation systems that must stay explainable.',
            summary: 'Legal systems are especially damaged by opaque scoring logic. SECS constrains the advisory path so recommendation, hold, and veto are explicit rather than improvised.',
            missionTitle: 'Example Mission: Sentencing-range advisory recommendation',
            missionSummary: 'A legal decision-support system evaluates admissible case signals but must prove it stayed within a bounded, identity-conscious governance surface.',
            meta: [
                { label: 'Adaptor pressure', value: 'Fairness, explainability, bounded recommendation' },
                { label: 'Operator question', value: 'Can the recommendation be shown not to depend on forbidden identity factors?' },
                { label: 'Failure posture', value: 'The advisory path holds if the admissible surface is exceeded' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Case attributes, procedural posture, and admissible legal signals enter the cycle.' },
                { phase: '02 · Accept', detail: 'Identity-sensitive or non-admitted factors are rejected at the perimeter.' },
                { phase: '03 · React', detail: 'The adaptor produces an advisory range, a hold, or a veto.' },
                { phase: '04 · Emit Proof', detail: 'The advisory chain becomes replayable for scrutiny.' }
            ],
            gains: [
                { title: 'Bounded advisory logic', detail: 'Recommendation systems stay within a declared constitutional surface.' },
                { title: 'Replayable scrutiny', detail: 'Challenges can examine the exact advisory path.' },
                { title: 'Identity discipline', detail: 'Forbidden factors are structurally blocked.' },
                { title: 'Cleaner explanation', detail: 'Legal review gets a governed chain instead of a black box.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '3', meaning: 'Moderate sensitivity to unusual advisory conditions.' },
                { name: 'severeDriftMagnitude', value: '0.4', meaning: 'Relatively low drift tolerance before review.' },
                { name: 'vetoFreqThreshold', value: '2', meaning: 'Repeated vetoes suggest the advisory surface is badly tuned.' }
            ],
            incident: [
                'An advisory request includes a factor outside the declared legal signal set.',
                'The adaptor holds the recommendation and records the failed admission condition.',
                'A later review can reproduce the same non-release outcome.'
            ],
            regulators: ['EU AI Act Art. 14', 'ECHR Art. 6', 'Judicial process safeguards']
        },
        'supply-chain': {
            label: 'Supply Chain',
            icon: 'fa fa-truck',
            kicker: 'Governed supplier-risk routing',
            subtitle: 'A bounded risk and escalation surface for supplier scoring, procurement controls, and disruption handling.',
            summary: 'Supply chain systems fail when risk scoring drifts quietly and exceptions become informal policy. SECS makes the route explicit, bounded, and replayable.',
            missionTitle: 'Example Mission: Supplier-risk escalation',
            missionSummary: 'A supplier-risk model flags a procurement path for review while proving no unauthorised identity or unstable control logic influenced the decision.',
            meta: [
                { label: 'Adaptor pressure', value: 'Traceable supplier governance' },
                { label: 'Operator question', value: 'Can the supplier assessment be replayed under the same envelope?' },
                { label: 'Failure posture', value: 'Bad or unstable risk paths hold before procurement action' }
            ],
            workflow: [
                { phase: '01 · Spark In', detail: 'Supplier state, disruption indicators, and admissible risk signals enter the cycle.' },
                { phase: '02 · Accept', detail: 'The perimeter rejects malformed or policy-breaking assessment surfaces.' },
                { phase: '03 · React', detail: 'The adaptor scores, escalates, or vetoes the path under the constraint surface.' },
                { phase: '04 · Emit Proof', detail: 'The governance proof explains how the risk posture was produced.' }
            ],
            gains: [
                { title: 'Replayable supplier review', detail: 'Disputes become governable rather than political.' },
                { title: 'No hidden escalation debt', detail: 'Exceptions stay visible and bounded.' },
                { title: 'Structural drift detection', detail: 'The scoring surface cannot wander silently for months.' },
                { title: 'Clear audit chain', detail: 'Procurement review can inspect the actual governed path.' }
            ],
            config: [
                { name: 'anomalyThreshold', value: '5', meaning: 'Broader tolerance across a noisy operational surface.' },
                { name: 'severeDriftMagnitude', value: '0.6', meaning: 'Meaningful drift still triggers review.' },
                { name: 'vetoFreqThreshold', value: '3', meaning: 'Repeated vetoes indicate an unstable supplier-risk model.' }
            ],
            incident: [
                'A supplier-risk escalation arrives with an unstable or incomplete evidence surface.',
                'The adaptor blocks action and emits a proofable governance reason.',
                'Procurement review can rerun the same case under replay.'
            ],
            regulators: ['EU CSRD', 'CSDDD', 'Basel III-linked risk governance']
        }
    };

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function slugs() {
        return Object.keys(verticals);
    }

    function getSlug() {
        var params = new URLSearchParams(window.location.search);
        var slug = params.get('vertical') || window.location.hash.replace('#', '');
        if (!slug || !verticals[slug]) {
            return 'robotics';
        }
        return slug;
    }

    function updateUrl(slug) {
        var url = new URL(window.location.href);
        url.searchParams.set('vertical', slug);
        url.hash = '';
        window.history.replaceState({}, '', url.toString());
    }

    function renderSelector(activeSlug) {
        $('vertical-select').innerHTML = slugs().map(function (slug) {
            return '<option value="' + escapeHtml(slug) + '">' + escapeHtml(verticals[slug].label) + '</option>';
        }).join('');
        $('vertical-select').value = activeSlug;

        $('vertical-switcher').innerHTML = slugs().map(function (slug) {
            var item = verticals[slug];
            return '<button class="vertical-demo-pill' + (slug === activeSlug ? ' active' : '') + '" type="button" data-vertical="' + escapeHtml(slug) + '">' +
                '<i class="' + escapeHtml(item.icon) + '"></i>' + escapeHtml(item.label) + '</button>';
        }).join('');
    }

    function renderMeta(items) {
        $('vertical-meta').innerHTML = items.map(function (item) {
            return '<div class="vertical-demo-meta-item"><span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(item.value) + '</strong></div>';
        }).join('');
    }

    function renderWorkflow(items) {
        $('vertical-workflow').innerHTML = items.map(function (item, index) {
            return '<div class="vertical-demo-step">' +
                '<div class="vertical-demo-step-index">' + escapeHtml(String(index + 1).padStart(2, '0')) + '</div>' +
                '<div><h4>' + escapeHtml(item.phase) + '</h4><p>' + escapeHtml(item.detail) + '</p></div>' +
            '</div>';
        }).join('');
    }

    function renderGains(items) {
        $('vertical-gains').innerHTML = items.map(function (item) {
            return '<div class="vertical-demo-gain"><h4>' + escapeHtml(item.title) + '</h4><p>' + escapeHtml(item.detail) + '</p></div>';
        }).join('');
    }

    function renderConfig(items) {
        $('vertical-config').innerHTML = '<tbody>' + items.map(function (item) {
            return '<tr><th>' + escapeHtml(item.name) + '</th><td><strong>' + escapeHtml(item.value) + '</strong><br>' + escapeHtml(item.meaning) + '</td></tr>';
        }).join('') + '</tbody>';
    }

    function renderIncident(items) {
        $('vertical-incident').innerHTML = items.map(function (item) {
            return '<div class="vertical-demo-incident-item"><span class="vertical-demo-incident-dot"></span><p>' + escapeHtml(item) + '</p></div>';
        }).join('');
    }

    function renderWorkingApp(app) {
        var el = $('vertical-working-app');
        if (!el) return;
        if (!app || !app.href) {
            el.style.display = 'none';
            el.innerHTML = '';
            return;
        }
        el.style.display = 'block';
        el.innerHTML =
            '<div style="padding:14px 16px;border-radius:12px;border:1px solid rgba(72,230,98,0.28);background:rgba(72,230,98,0.07);">' +
            '<div style="font-family:var(--font-mono);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent-green);margin-bottom:8px;">Working app · ' +
            escapeHtml(app.status || 'Available') +
            '</div>' +
            '<a href="' + escapeHtml(app.href) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent-blue);font-weight:500;">' +
            escapeHtml(app.label || 'Open app') +
            '</a>' +
            (app.note ? '<p style="margin:8px 0 0;color:var(--text-muted);font-size:0.88rem;">' + escapeHtml(app.note) + '</p>' : '') +
            ' · <a href="apps.html" style="color:var(--text-secondary);font-size:0.88rem;">All apps</a>' +
            '</div>';
    }

    function renderRegulators(items) {
        $('vertical-regulators').innerHTML = items.map(function (item) {
            return '<span><i class="fa-solid fa-check"></i>' + escapeHtml(item) + '</span>';
        }).join('');
    }

    function renderVertical(slug) {
        var vertical = verticals[slug] || verticals.robotics;
        document.title = vertical.label + ' Workflow — SECS Vertical Demo';
        $('vertical-title').textContent = vertical.label + ' Workflow';
        $('vertical-subtitle').textContent = vertical.subtitle;
        $('vertical-kicker').innerHTML = '<i class="' + escapeHtml(vertical.icon) + '"></i>' + escapeHtml(vertical.kicker);
        $('vertical-summary').textContent = vertical.summary;
        $('vertical-mission-title').textContent = vertical.missionTitle;
        $('vertical-mission-summary').textContent = vertical.missionSummary;
        renderMeta(vertical.meta);
        renderWorkflow(vertical.workflow);
        renderGains(vertical.gains);
        renderConfig(vertical.config);
        renderIncident(vertical.incident);
        renderRegulators(vertical.regulators);
        renderWorkingApp(vertical.workingApp);
        renderSelector(slug);
        updateUrl(slug);
    }

    function bind() {
        $('vertical-select').addEventListener('change', function (event) {
            renderVertical(event.target.value);
        });

        $('vertical-switcher').addEventListener('click', function (event) {
            var button = event.target.closest('[data-vertical]');
            if (!button) return;
            renderVertical(button.getAttribute('data-vertical'));
            $('vertical-select').value = button.getAttribute('data-vertical');
        });
    }

    bind();
    renderVertical(getSlug());
})();