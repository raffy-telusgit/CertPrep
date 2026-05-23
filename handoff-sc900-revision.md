# SC-900 Question Bank Revision — Handoff Notes

**Context:** This documents exactly what was done to fix the GCP PCDE question bank (May 2026), and translates that process to the SC-900 bank. Do this in one session.

---

## 1. What's broken in the current SC-900 bank

Run this audit first to confirm the numbers haven't changed:

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/questions/sc-900.json', 'utf8'));
const pos = {0:0,1:0,2:0,3:0}, diff = {easy:0,medium:0,hard:0};
data.questions.forEach(q => { pos[q.correctAnswers[0]]++; diff[q.difficulty]++; });
let longest = 0;
data.questions.forEach(q => {
  const lens = q.options.map(o => o.length);
  if (lens[q.correctAnswers[0]] === Math.max(...lens)) longest++;
});
console.log('Position dist:', pos);
console.log('Difficulty:', diff);
console.log('Correct is longest:', longest + '/' + data.questions.length);
"
```

**Expected output (from May 2026 audit):**
- Position: `{ '0': 261, '1': 29, '2': 10, '3': 0 }` — answer A is correct 87% of the time
- Difficulty: `{ easy: 103, medium: 197, hard: 0 }` — zero hard questions
- Correct is longest: `205/300 = 68.3%`

**Goals:** Even position distribution (~75 each), balanced option lengths, and a real difficulty spread (target: ~50 easy / 175 medium / 75 hard per 300 questions).

---

## 2. SC-900 bank structure

| Category | Slug | Questions |
|---|---|---|
| Security, Compliance, and Identity Concepts | `concepts` | 40 |
| Microsoft Entra | `entra` | 80 |
| Microsoft Security Solutions | `security` | 115 |
| Microsoft Compliance Solutions | `compliance` | 65 |

**ID format:** `sc900-{slug}-001` through `sc900-{slug}-NNN`
**examId:** `sc-900`

Because the categories are unevenly sized, split into 6 agent batches:

| Batch | Category | Agent questions | IDs |
|---|---|---|---|
| batch-1 | concepts | 40 | sc900-concepts-001–040 |
| batch-2 | entra-A | 40 | sc900-entra-001–040 |
| batch-3 | entra-B | 40 | sc900-entra-041–080 |
| batch-4 | security-A | 60 | sc900-security-001–060 |
| batch-5 | security-B | 55 | sc900-security-061–115 |
| batch-6 | compliance | 65 | sc900-compliance-001–065 |

---

## 3. Pre-computed position sequences

These are balanced and verified. Paste each one into the corresponding agent prompt verbatim. The agent must use them in order (question 1 gets seq[0], question 2 gets seq[1], etc.).

**batch-1 — concepts, 40 questions** (10 per position ✓)
```
[3,0,2,3,0,3,1,0,1,2,3,0,3,2,1,2,0,0,2,1,1,2,3,3,0,3,2,1,1,2,3,2,3,1,0,1,0,2,0,1]
```

**batch-2 — entra-A, 40 questions** (10 per position ✓)
```
[0,0,3,2,1,3,2,3,2,1,2,2,1,3,2,1,3,0,2,0,0,2,3,2,3,0,3,3,0,0,1,1,3,1,0,0,1,1,2,1]
```

**batch-3 — entra-B, 40 questions** (10 per position ✓)
```
[3,2,1,3,2,1,3,1,3,2,1,3,3,0,0,0,1,3,0,0,2,2,0,2,1,2,0,0,0,3,2,3,3,1,1,2,2,0,1,1]
```

**batch-4 — security-A, 60 questions** (15 per position ✓)
```
[2,0,2,3,2,0,0,2,1,1,0,2,1,3,1,1,2,3,2,3,1,0,1,0,3,2,2,0,2,3,0,3,2,1,0,0,3,1,2,0,3,0,0,3,3,3,2,0,2,1,0,1,1,1,2,1,3,3,3,1]
```

**batch-5 — security-B, 55 questions** (14/14/14/13 ✓)
```
[2,0,1,1,1,0,1,0,1,3,1,1,0,3,2,3,2,0,2,0,2,1,1,2,0,2,0,3,3,3,0,0,3,2,2,3,0,3,1,3,2,1,3,2,3,1,0,2,1,3,0,0,2,2,1]
```

**batch-6 — compliance, 65 questions** (17/16/16/16 ✓)
```
[1,3,1,0,1,2,1,2,0,3,2,0,2,2,1,2,0,3,3,0,0,2,2,0,0,1,0,0,3,3,3,3,1,2,3,2,1,3,0,3,0,3,3,3,2,3,3,1,1,1,1,0,2,1,2,0,2,0,1,0,2,1,2,0,1]
```

---

## 4. Answer quality rules (paste into every agent prompt)

This is the most important section. The previous SC-900 bank had the same length-bias problem as PCDE. Include these rules verbatim in each agent prompt:

```
MANDATORY ANSWER QUALITY RULES:

1. BALANCED LENGTH: All 4 options must be 90–180 characters each and within
   ~35% character count of each other. If your correct answer is 150 chars,
   every distractor must be 100–200 chars. Expand short distractors with
   specific Microsoft product names, portal paths, or feature details.

2. NO LENGTH TELLS: The correct answer must NOT be consistently the longest
   option. It should sometimes be shortest, sometimes longest, usually middle.

3. TECHNICALLY SPECIFIC DISTRACTORS: Each wrong option must reference a real
   Microsoft product or feature. Acceptable distractor types:
   - Right Microsoft service, wrong configuration or license tier
   - Valid feature in a different Microsoft 365 or Azure product
   - Correct security concept applied to the wrong scenario
   - Real feature that partially addresses the scenario but misses a key requirement

4. NO OBVIOUS WRONG ANSWERS: Every distractor must be something a real
   candidate who studied the material could genuinely consider.

5. EXPLANATION FORMAT: "Option A is wrong because [specific reason].
   Option B is correct because [reason]. Option C is wrong because [specific
   reason]. Option D is wrong because [specific reason]."
```

---

## 5. Topic coverage per category

### concepts (40 questions)
- Shared responsibility model (IaaS/PaaS/SaaS splits)
- Zero Trust principles (verify explicitly, least privilege, assume breach)
- Defense in depth (layers: physical, identity, perimeter, network, compute, application, data)
- Encryption: at rest vs in transit, symmetric vs asymmetric, certificate concepts
- Authentication vs authorization; MFA factors (something you know/have/are)
- Federation and SSO concepts
- Compliance concepts: data sovereignty, data residency, privacy regulations (GDPR)
- Common threat types: phishing, ransomware, supply chain attacks, DDoS

### entra (80 questions, split into 2 batches of 40)
- Microsoft Entra ID: users, groups (security vs M365), directory roles
- Authentication: password hash sync, pass-through auth, ADFS federation
- SSPR (self-service password reset): registration, methods, scope
- MFA: methods (authenticator app, FIDO2, SMS, voice), per-user vs Conditional Access
- Conditional Access: policies, conditions (user/group, device, location, app), grant controls
- Identity Protection: risk detections (sign-in risk, user risk), policies, remediation
- External Identities: B2B (guest access) vs B2C (customer identity)
- Privileged Identity Management (PIM): eligible vs active roles, activation, approval
- Access reviews: scope, reviewers, recurrence, outcomes
- Entitlement management: access packages, policies, catalogs
- Entra ID governance: lifecycle workflows, joiner/mover/leaver

### security (115 questions, split into 60+55)
- Microsoft Defender for Cloud: CSPM vs CWP, secure score, recommendations, regulatory compliance
- Defender for Cloud plans: Defender for Servers, Containers, SQL, Storage, App Service, etc.
- Microsoft Sentinel: SIEM + SOAR, connectors, analytics rules, incidents, playbooks (Logic Apps), workbooks, UEBA
- Microsoft Defender XDR: unified portal, auto investigation, attack story
  - Defender for Endpoint: onboarding, EDR, vulnerability management
  - Defender for Office 365: safe links, safe attachments, anti-phishing, Plan 1 vs 2
  - Defender for Identity: on-prem AD monitoring, lateral movement detection
  - Defender for Cloud Apps: CASB, app discovery, conditional access app control, policies
- Azure DDoS Protection: Basic vs Standard, mitigation policies, telemetry
- Azure Firewall: FQDN rules, network rules, application rules, SKU tiers (Standard vs Premium), IDPS
- Network Security Groups: inbound/outbound rules, priority, default rules
- Azure Web Application Firewall: mode (detection vs prevention), rule sets (OWASP), exclusions
- Azure Key Vault: keys, secrets, certificates, access policies vs RBAC, soft delete, purge protection
- Azure Bastion: SKUs (Basic vs Standard vs Premium), no public IP on VMs, RDP/SSH from portal

### compliance (65 questions)
- Microsoft Purview: unified governance portal (formerly compliance center)
- Compliance Manager: assessments, improvement actions, compliance score, control library
- Information Protection: sensitivity labels, label policies, auto-labeling, protection actions (encryption, watermark, header/footer)
- Data Loss Prevention (DLP): policies, conditions, actions, endpoint DLP, Teams DLP
- Data Lifecycle Management: retention labels vs retention policies, retention vs deletion, records management, disposition review
- Communication Compliance: policies, reviewers, scope, integration with Teams/Exchange
- Insider Risk Management: policies (data theft, data leaks), indicators, alerts, cases
- eDiscovery: Standard vs Premium, content search, holds, export, custodians
- Audit: Standard vs Premium, log retention, activity search
- Microsoft Priva: Privacy Risk Management, Subject Rights Requests
- Service Trust Portal: compliance reports, trust documents, regional resources

---

## 6. Difficulty targets per batch

| Batch | Questions | Easy | Medium | Hard |
|---|---|---|---|---|
| batch-1 (concepts 40) | 40 | 8 | 22 | 10 |
| batch-2 (entra-A 40) | 40 | 7 | 22 | 11 |
| batch-3 (entra-B 40) | 40 | 7 | 22 | 11 |
| batch-4 (security-A 60) | 60 | 10 | 35 | 15 |
| batch-5 (security-B 55) | 55 | 9 | 31 | 15 |
| batch-6 (compliance 65) | 65 | 9 | 37 | 19 |
| **Total** | **300** | **50** | **169** | **81** |

---

## 7. Agent prompt structure

Each agent call should follow this template (fill in the bracketed parts):

```
Generate exactly [N] exam questions for the Microsoft SC-900 Security,
Compliance, and Identity Fundamentals certification.

Fetch https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-900
to understand the exam scope.

Category: [FULL CATEGORY NAME]
Slug: [slug]
ID range: sc900-[slug]-[start] through sc900-[slug]-[end]
Output file: src/data/questions/sc-900-batch-[N].json

File must be a bare JSON array (no wrapper object, no markdown, no code fences).

MANDATORY POSITION SEQUENCE (use in order, question 1 = seq[0]):
[paste the verified sequence here]

[paste the full quality rules section from §4]

Difficulty: [easy count] easy, [medium count] medium, [hard count] hard.
Topics: [paste relevant subsection from §5]

[paste a 1-question example with balanced options, same format as PCDE handoff]
```

Launch all 6 agents in a single message (parallel execution). Each writes to its own batch file.

---

## 8. Merge step

After all 6 agents complete, run:

```javascript
// merge-sc900.js — run with: node merge-sc900.js
const fs = require('fs');
const batches = [1,2,3,4,5,6].map(n =>
  JSON.parse(fs.readFileSync(`src/data/questions/sc-900-batch-${n}.json`, 'utf8'))
);
const all = batches.flat();
const out = {
  examId: 'sc-900',
  version: 2,
  placeholder: false,
  generatedAt: new Date().toISOString().slice(0,10),
  questions: all
};
fs.writeFileSync('src/data/questions/sc-900.json', JSON.stringify(out, null, 2), 'utf8');
console.log('Written:', all.length, 'questions');
const pos = {0:0,1:0,2:0,3:0};
all.forEach(q => pos[q.correctAnswers[0]]++);
console.log('Position dist:', pos);
[1,2,3,4,5,6].forEach(n => fs.unlinkSync(`src/data/questions/sc-900-batch-${n}.json`));
console.log('Batch files deleted.');
```

---

## 9. QA checklist (run after merge)

Spawn the QA agent with these checks:

1. **Schema:** all 300 questions have id, question, exactly 4 options, correctAnswers (1 element, 0–3), explanation, category, difficulty
2. **Position dist:** count correctAnswers[0] values — each should be 65–85 (no single value >100 or <50)
3. **Length bias:** correct answer should be longest in ≤50% of questions
4. **Duplicate IDs:** all 300 must be unique
5. **Difficulty:** at least 40 hard questions total; no category has 0 hard
6. **Unicode check:** grep for `Ã—`, `â€"`, `â€™` — must be zero (this was a bug in PCDE v1)
7. **Explanation desyncs:** for a sample of 20 questions, check the letter the explanation calls correct matches correctAnswers[0] (A=0, B=1, C=2, D=3) — this was the most common bug in PCDE v1, concentrated in questions assigned index 3 (D)
8. **Content spot-check:** 3 questions per category — are distractors plausible and technically specific?
9. **Build:** `npm run build` and `npm run lint` must both pass

---

## 10. Known pitfalls from PCDE revision

- **Unicode encoding artifacts** appeared in 48/300 PCDE questions (`Ã—`, `â€"`, `â€™`). If they appear again, do a global search-replace on the JSON file.
- **Explanation/answer desyncs** hit 14 questions, almost all at index 3 (D). The model sometimes generates a question with the correct answer at position C in its "mental draft" but writes `correctAnswers:[3]` to match the sequence. The explanation then says "Option C is correct." Fix: read the explanation, find which letter it calls correct, update `correctAnswers` to match that letter. Accept ±5 drift from the target 75/75/75/75.
- **Content bugs** (wrong math in option text, explanation contradicting option): rare but happened. QA spot-check will catch them.
- **Batch file not written:** occasionally an agent writes valid JSON but the file path uses forward slashes on Windows and the write fails silently. If a batch file is missing after agents complete, check the agent output for error messages.

---

## 11. Commit

```bash
git add src/data/questions/sc-900.json
git commit -m "feat(data): regenerate SC-900 question bank v2 with balanced answer distribution"
git push origin main
```
