# GCP PCDE — Revision Notes Based on Practice Results

**Score: 33/60 (55%)** — below the 70% pass threshold. 27 missed questions cluster into 5 weak areas. Focus revision here.

---

## Weak-area heatmap

| Area | Missed | Pattern |
|---|---|---|
| CI/CD (Binary Auth, Cloud Deploy, Cloud Build, Artifact Registry) | 7 | Product-specific details |
| SRE principles (SLIs, windows, DR, postmortems, burn rates) | 7 | Concept depth |
| Performance & optimization (Profiler, Cloud SQL, VPA, networking) | 6 | Feature recall |
| Observability (Monitoring, Trace, OTel) | 4 | OpenTelemetry specifics |
| SRE practices (chaos, toil, Config Sync) | 3 | Operational judgment |

---

## 1. CI/CD — biggest gap, drill these first

### Q20 / Q26 — Binary Authorization
- Policy = **admission rule + list of trusted attestors**.
- An **Attestor** wraps a public key (PKIX or PGP via KMS) — it represents the *identity* whose signature the policy trusts.
- An **Attestation** is a signed statement bound to a specific image digest; created during the pipeline (e.g., after vuln scan passes).
- The signing identity in policy = an **Attestor** (Q26 answer).
- Multi-attestor policy lets you require BOTH "built by Cloud Build" AND "scanned with no critical CVEs" — separate attestors, both required (Q20 answer).
- Key fact: BinAuth verifies attestations at **GKE admission time**, not build time.

### Q31 — Cloud Deploy parameterization
- The construct that lets one pipeline definition behave differently per stage is **deploy parameters** (a.k.a. `deployParameters` on the target or stage).
- They flow into the skaffold/render step and into custom verify jobs.
- This is how you say "soak=0 in dev, soak=300s in prod" from one pipeline YAML.
- Don't confuse with: **custom targets** (different deploy mechanism per target) or **profiles** (skaffold-level rendering switch).

### Q33 — Artifact Registry repositories
- Each repo is **bound to one format** (Docker, Maven, npm, Python, …) at creation; immutable.
- So Docker + Maven = **minimum 2 repos**.
- There is **no multi-format flag**.
- Virtual repos exist for some formats (Maven, npm) but they're optional aggregations, not required for the minimum.

### Q40 — Cloud Build egress control
- Beyond VPC-SC and firewall rules: use a **Private Pool with `egressOption: NO_PUBLIC_EGRESS`**.
- That denies the worker any route to the public internet — even if a build step tries to `curl evil.com`, it fails.
- Default pools have public egress and can't be locked down to private-only.

### Q56 — Cloud Build cache
- Recommended pattern: cache lives in a **Cloud Storage bucket**, fetched/uploaded with the `gcr.io/cloud-builders/gsutil` step (or `gcs_source_staging` for sources).
- Not Artifact Registry (that's for build outputs, not transient cache).
- Not the `/workspace` volume (it's per-build only).
- Kaniko cache + Cloud Build's `--cache` flag works for Docker layers specifically.

### Q58 — Cloud Deploy verify hanging despite exit 0
- Cloud Deploy verify jobs are **Cloud Build jobs**, but Cloud Deploy waits for the build's **terminal status** in the Cloud Deploy control plane, not just exit code in logs.
- Most likely cause: the **verify Cloud Build service account lacks the `roles/clouddeploy.jobRunner` permission** (or `clouddeploy.serviceAgent`) to report status back, so the rollout phase never sees completion.
- Also check: verify job uses a service account in a different project without cross-project IAM.

---

## 2. SRE principles — depth gaps

### Q8 — Why "p99 < 500ms over 5min" is a weak SLI
- Recommended SLI form: **good_events / total_events**, e.g., `(requests with latency < 500ms) / (total requests)`.
- A percentile threshold is a *statistic about* the data, not an event ratio — it doesn't compose with an error budget cleanly. You can't say "this request consumed X% of the budget."
- Also: percentile-of-percentiles math is broken across windows.

### Q10 — DR runbooks must be tested
- Untested DR = **theoretical DR**. SRE practice: run scheduled DR exercises (game days) on a regular cadence — quarterly at minimum for tier-1 services.
- "It's documented" is not the same as "it works." Documentation rots; dependencies change.
- The right response to "testing is risky" is to test in **lower environments first**, then production with controlled blast radius (e.g., shift % of traffic).

### Q22 — When to choose a longer SLO window (90 days)
- Longer windows favor **stability of the SLO signal** when:
  - Traffic is bursty/seasonal and a short window swings wildly with one bad day
  - You want the budget to absorb a single incident without policy panic
  - The service is critical and you're tracking long-term reliability trends
- Shorter windows (7d) react faster but are noisier and can trigger budget exhaustion from one incident.

### Q35 — Reliability vs velocity
- Reliability and velocity are **traded off via the error budget**.
- Budget healthy → velocity wins (ship features).
- Budget consumed → reliability wins (slow/freeze releases per policy).
- The error budget is the **explicit mechanism** for the tradeoff, not a vibe.

### Q43 — Postmortem "lessons learned"
- Best style: **generalizable, blameless, actionable** — written so another team reading it 6 months later can apply the lesson to a different system.
- Anti-pattern: incident-specific stack traces, or vague platitudes like "we need better monitoring."
- Good lessons name a class of failure ("any service with synchronous cross-region writes is vulnerable to X") plus a concrete countermeasure.

### Q45 — Batch SLI on Dataflow
- For batch: SLI is usually **freshness/coverage**, not request-rate.
- Common formulations:
  - "Fraction of pipeline runs that complete within N minutes of scheduled start" (timeliness)
  - "Fraction of expected records processed per run" (completeness)
  - "Output freshness ≤ X minutes behind real-time" (data freshness)
- Don't try to bolt request-based SLIs onto batch — wrong shape.

### Q51 — Multi-window multi-burn-rate alerting
- For a 99.5% / 300ms SLO over 28 days, you want **two alerts**:
  - **Fast burn (page):** burn rate 14.4× over 1-hour window, gated by burn rate >14.4× over a short secondary window (~5 min) → consumes 2% of monthly budget in 1 hour.
  - **Slow burn (ticket):** burn rate 1× over 6-hour or 24-hour window with longer gating → catches drift without paging.
- Avoid: raw error-rate thresholds without burn-rate framing (noisy, doesn't scale with SLO).
- Avoid: alerting only when SLO is already breached (too late).

---

## 3. Performance & optimization

### Q5 / Q21 — Cloud Profiler on Java
- Q5 config: include the **Cloud Profiler Java agent JAR** via `-agentpath:/opt/cprof/profiler_java_agent.so=-cprof_service=<name>,-cprof_service_version=<version>` (or the equivalent newer flag).
- Set `service` and `service_version` so profiles are scoped and comparable across releases.
- Q21 attribution after a deploy: use **Profile comparison** in the Cloud Profiler UI — pick the new `service_version` as the profile and an older `service_version` as the comparison base. Flame graph diffs show which call paths regressed.
- This is why `service_version` matters: without it, comparisons are useless.

### Q18 — Global latency for Cloud Run in one region
- Most impactful change: put a **Global External HTTP(S) Load Balancer** in front of Cloud Run, with **Premium network tier** so user traffic enters Google's edge close to them.
- For static assets: enable **Cloud CDN** on the load balancer.
- For more impact: deploy Cloud Run in **multiple regions** (multi-region Cloud Run service) so user requests terminate close to the user, not in us-central1.
- Don't pick: changing concurrency, scaling min-instances — these don't fix the 100ms+ of WAN latency.

### Q19 — Cloud SQL managed connection pooling
- Recent feature: **managed connection pooling in Cloud SQL** (PgBouncer-style) — multiplexes client connections without a sidecar or app changes.
- Application keeps its existing connection string. Cloud SQL handles the pool.
- Don't pick: bumping `max_connections` (RAM blowup), read replica (requires app change), HA failover (passive standby).

### Q24 — VPA disruption
- VPA in Auto mode evicts pods to apply new recommendations → disruption.
- Fix that preserves recommendations: pair VPA with a **PodDisruptionBudget** AND/OR switch VPA to **Initial mode** (apply recommendations only at pod start) — or use **Auto with `updateMode: Recreate`** combined with PDB ceilings.
- Or split: keep VPA in **Off/Recommendation mode** (advisory) and apply manually during low-traffic windows.

### Q38 — Mobile users on lossy networks
- Protocol-level win: **HTTP/3 (QUIC)**. QUIC's multiplexed UDP transport doesn't head-of-line block on packet loss the way TCP+TLS+HTTP/2 does.
- Google Cloud Load Balancers support HTTP/3 — enable it on the frontend.
- TLS handshake metrics being healthy is misleading — the loss occurs after handshake, during transfer.

---

## 4. Observability

### Q11 — Top-N namespace dashboard
- Use a **Line chart with Top N picker** set to 5, descending by aggregated CPU.
- Heatmaps = distributions (not ranking small N).
- Stacked area = composition, not ranking.
- Scorecard = single value, not a list.

### Q12 — Profiler shows hot CPU in a function that calls Spanner
- If Trace shows the Spanner span dominates: the function isn't CPU-bound on its own logic — it's **blocked on the Spanner call**.
- Focus = **the Spanner query/transaction**, not the calling function. Look at query plan, hot rows, transaction type.
- Trap: Cloud Profiler reports wall-clock or CPU time depending on profile type; a function that *waits* on RPC can show "hot" in wall-clock CPU.

### Q28 — Send same spans to Cloud Trace + third-party
- Most flexible: **OpenTelemetry Collector** with multiple exporters (Cloud Trace exporter + third-party OTLP exporter) configured in the pipeline.
- App emits OTLP once → Collector fan-out.
- Don't pick: dual-instrumenting the app, writing custom forwarding code — both are brittle.

### Q34 — OTel propagation header
- Default trace context for Cloud Trace today: **W3C Trace Context** — `traceparent` header (and `tracestate`).
- Older `x-cloud-trace-context` still works for Google-native paths, but **W3C `traceparent` is the OTel default** and what's recommended for portability.

---

## 5. SRE practices

### Q17 — Chaos game day, dependent service crashes unexpectedly
- Immediate response: **halt the experiment, restore the injected dependency, stabilize**. Chaos engineering principle: stop the game day the moment user impact exceeds the planned blast radius or unexpected behavior appears.
- Then: capture the data, treat the discovery as a **finding** (a real reliability bug to fix), schedule a follow-up game day after the fix.
- Don't pick: "let it run to see what else breaks" — that's now an incident, not a controlled test.

### Q39 — Toil elimination for weekly manual scale-up
- The toil-eliminating fix is **automation that scales the node pool on a schedule or predictively** — e.g., GKE cluster autoscaler tuned for the workload, or Kubernetes HPA + Cluster Autoscaler, or scheduled `gcloud container clusters resize` via Cloud Scheduler + Cloud Run.
- Don't pick: writing a runbook (documents the toil, doesn't eliminate it), adding more on-call coverage (same toil, more people), or paging on under-capacity (still manual).

### Q55 — Config Sync drift
- Config Sync detects the manual edit as **drift** and (by default) **reverts the change back to what Git says** — usually within minutes.
- During an incident, that's bad: the engineer's scale-up vanishes.
- Recommended permanent fix: **commit the change to Git** (Infrastructure-as-Code), let Config Sync apply it. If you need emergency override, use a documented break-glass procedure that temporarily pauses Config Sync on a specific namespace.

---

## Topics where you're solid — don't over-revise

- Error budget concepts, burn-rate math (Q1, Q48)
- Cloud Spanner hotspotting + secondary indexes + read-only txns (Q9, Q41)
- BigQuery clustering (Q52)
- Symptom vs cause alerting (Q14)
- Ops Agent config (Q13, Q32)
- Cloud Logging features (_Required bucket, log-based metrics, sinks) (Q37, Q53, Q57)
- Cloud Deploy basics (Q2, Q59, Q60)
- DR architecture (Q4, Q30)
- Postmortem participants (Q46)
- Incident roles — scribe (Q54)

---

## Suggested study plan (priority order)

1. **Binary Authorization end-to-end** (attestor vs attestation, policy structure, multi-attestor) — read the Google Cloud docs page top to bottom.
2. **Cloud Deploy advanced** — deploy parameters, custom targets, verify, automation rules, gates.
3. **Multi-window multi-burn-rate alerting math** — memorize the 14.4× constant and what it means; know the standard fast/slow burn pair.
4. **OpenTelemetry on GCP** — collector pipeline, exporters, W3C traceparent.
5. **Cloud Profiler workflow** — agent config flags, `service_version`, profile comparison.
6. **Cloud Run global latency patterns** — global HTTPS LB, multi-region deploy, Cloud CDN.
7. **VPA modes and PDB interaction.**

Re-test after working through these. Target: ≥ 75% on the same bank before sitting the real exam.
