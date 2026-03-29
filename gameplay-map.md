# The Game: SECS — Complete Gameplay Map

> *"Have you played the SECS game?"*
> That's the only way anyone can describe it.

---

## How It Works

You construct a **sovereign envelope** — a JSON payload with a profile, adaptor, record ID, and metadata fields — and fire it at a live constitutional gate. The gate evaluates your envelope against two layers:

- **α₀ (Constitutional Gate)** — Identity-free enforcement. No identity fields. Minimum 4 signals.
- **αⱼ (Adaptor Gate)** — Sector-specific rules. Allowed signals, required signals, valid values, record requirements, hold predicates.

Four possible outcomes:

| Verdict | What It Means | What Happens |
|---|---|---|
| **PASS** | Envelope admitted | Record content unlocked |
| **HOLD** | Governance review triggered | No strike — fix and resubmit |
| **ANNIHILATE** | Constitutional or adaptor violation | Strike (3 strikes = jail in Terminal) |
| **JAIL** | Profile-adaptor mismatch | Immediate lockout (Terminal only) |

---

## Two Frontends, One Gate

| | **Terminal** | **The Game: SECS** |
|---|---|---|
| Page | `terminal.html` | `game.html` |
| Style | CRT green-screen, guided | Dark hacker aesthetic, freeform |
| Modes | Human / Easy / "Can't AI Do It?" | No modes — raw |
| Hints | Sector briefings, field reveals | Field reference tabs only |
| Lives | 3 strikes = jail | Unlimited attempts |
| Goal | Complete all 5 records → Diploma | Get the banana → Collapse Algebra |
| Endpoint | Same: `/api/v1/terminal/admit` | Same: `/api/v1/terminal/admit` |

Both hit the same live gate on `secs-sovereign.fly.dev`. Same evaluate function. Same constitutional enforcement.

---

## Global Failure Modes (All Sectors)

These fire before any adaptor logic runs.

| Rule | Verdict | Trigger |
|---|---|---|
| `unknown-profile` | ANNIHILATE | Profile not in: `doctor`, `analyst`, `officer`, `engineer`, `teacher`, `adjuster` |
| `clearance-mismatch` | JAIL | Profile doesn't match the adaptor (e.g. `doctor` + `FINTECH`) |
| `unknown-adaptor` | ANNIHILATE | Adaptor not in: `HEALTH`, `FINTECH`, `DEFENCE`, `ENERGY`, `EDTECH`, `INSURANCE` |
| `unknown-record` | ANNIHILATE | Record ID doesn't exist in the adaptor |
| `empty-envelope` | ANNIHILATE | No metadata object |
| `insufficient-signals` | ANNIHILATE | Fewer than 4 metadata fields |
| `identity-free` | ANNIHILATE | Any of: `id`, `userId`, `user_id`, `accountId`, `account_id`, `sessionId`, `token`, `fingerprint`, `email`, `phone`, `name`, `username`, `deviceId` |
| `identity-breach` | ANNIHILATE | Adaptor-specific identity field detected (HEALTH only: `patientName`, `dateOfBirth`, `patientMRN`) |
| `allowed-signals` | ANNIHILATE | Metadata key not in the adaptor's allowed signal set |
| `required-signal` | ANNIHILATE | Required field missing or empty |
| `invalid-value` | ANNIHILATE | Enum field has a value not in the allowed list |
| `record-mismatch` | ANNIHILATE | Field value doesn't match the record's specific requirements |

All string matching is **case-insensitive** (normalised to uppercase internally).

---

## Profile → Adaptor Binding

| Profile | Role | Adaptor |
|---|---|---|
| `doctor` | Medical Imaging Specialist | `HEALTH` |
| `analyst` | Quantitative Analyst | `FINTECH` |
| `officer` | Intelligence Officer | `DEFENCE` |
| `engineer` | Grid Operations Engineer | `ENERGY` |
| `teacher` | EdTech Coordinator | `EDTECH` |
| `adjuster` | Claims Adjuster | `INSURANCE` |

Using the wrong profile for a sector = **JAIL**. Instant. No strikes. You're done.

---

## Sector 1: HEALTH (doctor)

**Compliance:** HIPAA · FDA 21 CFR Part 11

### Identity Fields (EXCLUDE or die)
`patientName`, `dateOfBirth`, `patientMRN`

### Signal Fields (all 8 required)
| Field | Valid Values |
|---|---|
| `scanType` | `MRI`, `CT`, `ULTRASOUND`, `XRAY`, `PET` |
| `bodyRegion` | `BRAIN`, `CHEST`, `ABDOMEN`, `PELVIS`, `SPINE`, `EXTREMITY` |
| `clinicalIndication` | Free text (minimum 10 characters) |
| `urgency` | `ROUTINE`, `URGENT`, `STAT` |
| `contrastRequired` | `YES`, `NO` |
| `referringDepartment` | `NEUROLOGY`, `CARDIOLOGY`, `ED`, `ONCOLOGY`, `RADIOLOGY`, `ORTHOPAEDICS`, `GENERAL` |
| `patientCategory` | `INPATIENT`, `OUTPATIENT`, `EMERGENCY` |
| `pregnancyStatus` | `YES`, `NO`, `NA` |

### Hold Predicates (HOLD, not strike)
| Name | Trigger |
|---|---|
| `contrast-pregnancy-contraindication` | `contrastRequired=YES` + `pregnancyStatus=YES` |
| `stat-non-emergency` | `urgency=STAT` + `patientCategory` ≠ `EMERGENCY` |

### Records

| ID | Title | Required Values | Special |
|---|---|---|---|
| `HR-001` | Brain MRI Protocol | `scanType=MRI`, `bodyRegion=BRAIN` | Standard PASS |
| `HR-002` | Cardiac CT Assessment | `scanType=CT`, `bodyRegion=CHEST`, `urgency=URGENT` | Standard PASS |
| `HR-003` | Emergency Imaging Review | `urgency=STAT`, `patientCategory=EMERGENCY` | **Queue Conflict** — ethical endgame |
| `HR-004` | Oncology Follow-Up | `referringDepartment=ONCOLOGY`, `bodyRegion=ABDOMEN` | **Escalation** — follow-up chain |
| `HR-005` | Paediatric Screening | `scanType=ULTRASOUND`, `bodyRegion=ABDOMEN` | **Critical Review** — incidental finding |

### Example: HR-001 PASS
```json
{
  "profile": "doctor",
  "adaptor": "HEALTH",
  "recordId": "HR-001",
  "metadata": {
    "scanType": "MRI",
    "bodyRegion": "BRAIN",
    "clinicalIndication": "Routine neurological screening for persistent headaches",
    "urgency": "ROUTINE",
    "contrastRequired": "NO",
    "referringDepartment": "NEUROLOGY",
    "patientCategory": "OUTPATIENT",
    "pregnancyStatus": "NA"
  }
}
```

---

## Sector 2: FINTECH (analyst)

**Compliance:** MiFID II · SOX · EMIR

### Signal Fields (all 8 required)
| Field | Valid Values |
|---|---|
| `instrumentId` | Free text |
| `venue` | `XNAS`, `XLON`, `XHKG`, `XFRA` |
| `side` | `BUY`, `SELL` |
| `quantity` | Numeric (must be ≥ 0) |
| `priceLevel` | `MARKET`, `LIMIT`, `VWAP`, `MID` |
| `strategyTag` | `MOMENTUM`, `MEAN_REVERSION`, `PAIRS`, `MANUAL`, `HEDGE` |
| `riskBucket` | `LOW`, `MODERATE`, `HIGH` |
| `complianceFlag` | `STANDARD`, `ESCALATED`, `RESTRICTED` |

### Hold Predicates
| Name | Trigger |
|---|---|
| `negative-quantity` | `quantity` < 0 |
| `high-risk-without-escalation` | `riskBucket=HIGH` + `complianceFlag` ≠ `ESCALATED` |

### Records

| ID | Title | Required Values | Special |
|---|---|---|---|
| `FT-001` | Equity Momentum Signal | `venue=XNAS`, `side=BUY`, `strategyTag=MOMENTUM`, `complianceFlag=STANDARD` | Standard PASS |
| `FT-002` | Cross-Border Settlement | `venue=XLON`, `side=SELL`, `riskBucket=MODERATE` | Standard PASS |
| `FT-003` | Algorithmic Audit Trail | `venue=XNAS`, `strategyTag=MEAN_REVERSION`, `complianceFlag=ESCALATED` | **Escalation** — emergency audit |
| `FT-004` | Portfolio Risk Matrix | `venue=XHKG`, `riskBucket=HIGH`, `complianceFlag=ESCALATED` | **Conflict** — halt vs continue |
| `FT-005` | Venue Liquidity Analysis | `venue=XFRA`, `side=BUY`, `strategyTag=PAIRS` | **Bypass** — identity required beyond substrate |

---

## Sector 3: DEFENCE (officer)

**Compliance:** NATO STANAG · MIL-STD-882E

### Signal Fields (all 8 required)
| Field | Valid Values |
|---|---|
| `sensorType` | `RADAR`, `EW`, `SIGINT`, `HUMINT`, `IMINT` |
| `threatClassification` | `FRIENDLY`, `NEUTRAL`, `UNKNOWN`, `HOSTILE` |
| `confidenceLevel` | `LOW`, `MEDIUM`, `HIGH` |
| `engagementZone` | `GREEN`, `AMBER`, `RED` |
| `rulesOfEngagement` | `ROE-ALPHA`, `ROE-BRAVO`, `ROE-CHARLIE` |
| `missionPhase` | `PLANNING`, `EXECUTION`, `RECOVERY` |
| `humanOverrideStatus` | `NONE`, `PENDING`, `CONFIRMED` |
| `classificationLevel` | `UNCLASSIFIED`, `RESTRICTED`, `CONFIDENTIAL` |

### Hold Predicates
| Name | Trigger |
|---|---|
| `hostile-without-human-override` | `threatClassification=HOSTILE` + `humanOverrideStatus` ≠ `CONFIRMED` |
| `red-zone-outside-execution` | `engagementZone=RED` + `missionPhase` ≠ `EXECUTION` |

### Records

| ID | Title | Required Values | Special |
|---|---|---|---|
| `DF-001` | Radar Contact Report | `sensorType=RADAR`, `threatClassification=FRIENDLY`, `engagementZone=GREEN`, `missionPhase=PLANNING` | Standard PASS |
| `DF-002` | Mission Phase Transition | `missionPhase=EXECUTION`, `rulesOfEngagement=ROE-BRAVO`, `confidenceLevel=MEDIUM`, `threatClassification=NEUTRAL` | Standard PASS |
| `DF-003` | Threat Assessment Brief | `sensorType=SIGINT`, `threatClassification=HOSTILE`, `confidenceLevel=HIGH`, `engagementZone=AMBER`, `humanOverrideStatus=CONFIRMED` | **Escalation** — engagement authority |
| `DF-004` | Rules of Engagement Directive | `missionPhase=EXECUTION`, `rulesOfEngagement=ROE-CHARLIE`, `humanOverrideStatus=CONFIRMED` | **Conflict** — engage vs hold fire |
| `DF-005` | Signals Intelligence Digest | `sensorType=EW`, `classificationLevel=RESTRICTED`, `threatClassification=FRIENDLY` | **Bypass** — identity required for ally attribution |

---

## Sector 4: ENERGY (engineer)

**Compliance:** NERC CIP · IEC 62443

### Signal Fields (8 required + 3 optional banana fields)
| Field | Valid Values | Required |
|---|---|---|
| `sensorCategory` | `THERMAL`, `VIBRATION`, `PRESSURE`, `FLOW` | Yes |
| `gridZone` | `ZONE-12`, `ZONE-18`, `ZONE-31`, `ZONE-47` | Yes |
| `loadLevel` | `NORMAL`, `HIGH`, `PEAK`, `EMERGENCY` | Yes |
| `anomalyType` | `NONE`, `MINOR`, `MODERATE`, `SEVERE` | Yes |
| `controlAction` | `OBSERVE`, `RAMP-UP`, `RAMP-DOWN`, `LOAD-SHED` | Yes |
| `safetyMargin` | Numeric (> 0 under EMERGENCY or HOLD) | Yes |
| `incidentRef` | Free text | Yes |
| `complianceStatus` | `VERIFIED`, `ESCALATED`, `RESTRICTED` | Yes |
| `scaleRequest` | Free text | No |
| `politeRequest` | Free text | No |
| `scaleUse` | Free text | No |

### Hold Predicates
| Name | Trigger |
|---|---|
| `zero-margin-emergency` | `loadLevel=EMERGENCY` + `safetyMargin` ≤ 0 |
| `severe-anomaly-bypass` | `anomalyType=SEVERE` (always holds — emergency procedures) |

### Records

| ID | Title | Required Values | Special |
|---|---|---|---|
| `EN-001` | Grid Stability Report | `sensorCategory=THERMAL`, `gridZone=ZONE-12`, `loadLevel=NORMAL`, `anomalyType=NONE` | Standard PASS |
| `EN-002` | Load Forecast Governance | `sensorCategory=PRESSURE`, `loadLevel=HIGH`, `controlAction=RAMP-UP` | Standard PASS |
| `EN-003` | CIP Compliance Certificate | `loadLevel=NORMAL`, `anomalyType=NONE`, `complianceStatus=VERIFIED` | Standard PASS |
| `EN-004` | Anomaly Detection Log | `sensorCategory=VIBRATION`, `loadLevel=PEAK`, `anomalyType=MODERATE`, `complianceStatus=ESCALATED` | **Escalation** — live grid review |
| `EN-005` | Demand Response Protocol | `controlAction=LOAD-SHED`, `loadLevel=EMERGENCY`, `complianceStatus=ESCALATED` | **Conflict** — shed load vs hold line |

### 🍌 The Banana Challenge

On **any** ENERGY record that PASSes, if you also include these three fields with exact values:

| Field | Value |
|---|---|
| `scaleRequest` | `banana` |
| `politeRequest` | `May I have a banana for scale` |
| `scaleUse` | `X-RAY_COMPARISON` |

The gate still PASSes — but the response changes. Instead of the standard record content, you receive the **Collapse Algebra**: the mathematical foundations of sovereign axiomatic compute.

The fields are custom to the user, but admissible within the bounds of the constraint system. The substrate doesn't care what a banana is. It only cares what a banana is *not*: identity.

**Response:** *"I got the Banana, how do you like them apples"*

---

## Sector 5: EDTECH (teacher)

**Compliance:** FERPA · COPPA

### Signal Fields (all 8 required)
| Field | Valid Values |
|---|---|
| `assessmentType` | `FORMATIVE`, `SUMMATIVE`, `DIAGNOSTIC` |
| `gradeLevel` | Free text (numeric grade, e.g. `9`) |
| `subjectArea` | `MATHEMATICS`, `SCIENCE`, `ENGLISH`, `HISTORY` |
| `performanceScore` | Free text (numeric) |
| `engagementLevel` | `LOW`, `MEDIUM`, `HIGH` |
| `interventionFlag` | `NONE`, `ACTIVE`, `ESCALATED` |
| `adaptivePathId` | Free text |
| `complianceStatus` | `VERIFIED`, `ESCALATED`, `RESTRICTED` |

### Hold Predicates
| Name | Trigger |
|---|---|
| `young-student-no-compliance` | `gradeLevel` < 6 + `complianceStatus` missing |
| `active-intervention-low-engagement` | `interventionFlag=ACTIVE` + `engagementLevel=LOW` |

### Records

| ID | Title | Required Values | Special |
|---|---|---|---|
| `ED-001` | Adaptive Learning Path | `assessmentType=FORMATIVE`, `gradeLevel=9`, `subjectArea=MATHEMATICS`, `engagementLevel=HIGH` | Standard PASS |
| `ED-002` | Assessment Framework | `assessmentType=SUMMATIVE`, `gradeLevel=11`, `subjectArea=SCIENCE`, `complianceStatus=VERIFIED` | Standard PASS |
| `ED-003` | Performance Dashboard | `assessmentType=DIAGNOSTIC`, `gradeLevel=8`, `subjectArea=ENGLISH`, `engagementLevel=MEDIUM` | Standard PASS |
| `ED-004` | Intervention Trigger | `gradeLevel=10`, `subjectArea=HISTORY`, `engagementLevel=LOW`, `interventionFlag=ESCALATED` | **Escalation** — student support |
| `ED-005` | Curriculum Standards Map | `assessmentType=SUMMATIVE`, `gradeLevel=12`, `subjectArea=MATHEMATICS`, `complianceStatus=VERIFIED` | **Bypass** — identity required for direct support |

---

## Sector 6: INSURANCE (adjuster)

**Compliance:** Solvency II · IDD

### Signal Fields (all 8 required)
| Field | Valid Values |
|---|---|
| `claimType` | `AUTO`, `PROPERTY`, `LIABILITY`, `HEALTH`, `LIFE` |
| `policyClass` | `STANDARD`, `PREMIUM`, `CORPORATE` |
| `claimAmount` | Numeric (must be ≥ 0) |
| `fraudIndicator` | `NONE`, `LOW`, `MEDIUM`, `HIGH` |
| `underwritingTier` | `TIER_1`, `TIER_2`, `TIER_3` |
| `regulatoryJurisdiction` | `US-NY`, `UK`, `EU-DE`, `AU-NSW`, `SG` |
| `riskScore` | Numeric (≥ 8 without ESCALATED = HOLD) |
| `complianceFlag` | `VERIFIED`, `ESCALATED`, `RESTRICTED` |

### Hold Predicates
| Name | Trigger |
|---|---|
| `negative-claim-amount` | `claimAmount` < 0 |
| `high-risk-without-escalation` | `riskScore` ≥ 8 + `complianceFlag` ≠ `ESCALATED` |

### Records

| ID | Title | Required Values | Special |
|---|---|---|---|
| `IN-001` | Claims Processing Record | `claimType=AUTO`, `policyClass=STANDARD`, `fraudIndicator=NONE` | Standard PASS |
| `IN-002` | Fraud Pattern Analysis | `claimType=PROPERTY`, `policyClass=PREMIUM`, `fraudIndicator=LOW` | Standard PASS |
| `IN-003` | Underwriting Decision | `claimType=LIABILITY`, `policyClass=CORPORATE`, `underwritingTier=TIER_3`, `regulatoryJurisdiction=UK`, `complianceFlag=ESCALATED` | **Escalation** — coverage chain review |
| `IN-004` | Regulatory Compliance Map | `claimType=LIABILITY`, `policyClass=CORPORATE`, `regulatoryJurisdiction=UK`, `complianceFlag=ESCALATED` | **Conflict** — automated adjudication halt |
| `IN-005` | Actuarial Portfolio Summary | `claimType=LIFE`, `underwritingTier=TIER_2`, `regulatoryJurisdiction=SG`, `fraudIndicator=NONE` | **Bypass** — identity required for legal attribution |

---

## Special Record Types

Every sector follows the same endgame pattern across its 5 records:

| Record | Pattern | What It Proves |
|---|---|---|
| **X-001** | Standard PASS | The gate works. Basic admissibility. |
| **X-002** | Standard PASS | Slightly harder constraints. |
| **X-003** | Escalation | The machine flags something. Human must review. |
| **X-004** | Ethical Conflict | The machine reaches its limit. Human must decide. |
| **X-005** | Substrate Bypass | Identity is needed. The substrate cannot help. It stops. |

This arc — from "the machine works" to "the machine stops" — is the point of having good SECS.

---

## Terminal: The Diploma Path

Complete all 5 records in any sector → unlock the **SECS Terminal Diploma**.

The diploma is a signed attestation that you navigated the constitutional gate, hit the ethical boundary, and understood *why* the machine stopped.

**Modes:**
- **HUMAN MODE** — No helpers. Raw fields. You work it out.
- **EASY MODE** — Sector briefings. Field reveals (costs a life).
- **"CAN'T AI DO IT?"** — Locked. Opens with Diploma completion. *If the human can't do it first, AI can't be trusted to do it.*

---

## The Game: SECS — The Banana Path

No modes. No lives. No hand-holding. Unlimited attempts.

You have the field reference. You have the endpoint. You know the answer is `"I got the Banana, how do you like them apples"` and the magic words are `"May I have a banana for scale"`.

The gate still stops you.

The banana proves the architecture: custom fields that carry no identity are constitutionally admissible. The substrate doesn't know what a banana is. It knows what a banana is not.

*Have you played the SECS game?*

---

## Envelope Format

```json
{
  "profile": "doctor|analyst|officer|engineer|teacher|adjuster",
  "adaptor": "HEALTH|FINTECH|DEFENCE|ENERGY|EDTECH|INSURANCE",
  "recordId": "HR-001|FT-001|DF-001|EN-001|ED-001|IN-001",
  "metadata": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

**Endpoint:** `POST https://secs-sovereign.fly.dev/api/v1/terminal/admit`
**Max payload:** 8KB
**Rate limit:** 60 requests/IP/minute

---

*The gate is live. The rules are public. The enforcement is real.*
*Good SECS requires consent, boundaries, and protection — the envelope proves all three.*
