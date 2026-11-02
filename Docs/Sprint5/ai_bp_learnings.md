# Sprint 5 — AI Business Partner Learnings

> Filed at sprint start (2026-07-14); completed at close-out (2026-09-24). Delivery record: [sprint_debrief.md](sprint_debrief.md).

## Themes to capture
- Cloud hosting story for Morgan (availability) vs Jamie (still no autonomous send)
- GenAIOps depth: prompts versioned like code without loosening Friction-Gate
- Glass-Box RBAC: only if Sam/Jamie reopen; thin gate already demoable
- Live Azure drafts vs stub: when assessors need `drafter_source=azure`

## Entries
- (2026-07-14) Glass-Box RBAC **IN**: demo roles (agent / compliance / DS) + audit trail + frozen SHAP glass-box. Pedagogical picker + API header (ADR 007) — not Entra ID. Still no `/send`.
- (2026-07-14) Assessor story update: Milestone 4 handover unchanged; Phase 5 mid-sprint adds explainability + role gates without reopening ops threshold or claiming cloud deploy.
- (2026-07-16) **Jamie requirements locked in register** ([jamie_requirements_register.md](jamie_requirements_register.md)): fairness/anti-discrimination mandatory in final presentation + report (JR-REQ-01/02); dashboard build/feature tour accessible to Risk (JR-REQ-03); standing HITL/ZDR/rate/RBAC/audit still required (JR-REQ-10…18). Open policy: EOD gate, extra attrs, mailer second approve, prod audit fields, Entra (JR-OPEN-01…05).
- (2026-07-16) **Stakeholder cascade:** engagement plan Jamie log + meetings index; Sam/Morgan preps note Jamie DoD; follow-up message filed at `Meetings/08_jamie_followup_message.md`.
- (2026-07-16) **Review fatigue:** HITL can fail via rubber-stamping — shipped JR-REQ-19 attention ack + high-stakes cue + audit timing ([review_fatigue_mitigation.md](review_fatigue_mitigation.md)). Deferred: random challenge %, daily budgets, dual mailer (JR-OPEN-03).
- (2026-07-17) **Morgan's business view:** risk shown as High / Medium / Low cohorts with AUM at risk rather than raw scores. Only the High (Tailored) cohort enters the human review queue; outbound drafts stay capacity-gated.
- (2026-09-22) **One source for fairness numbers:** the dashboard, API and docs now read the same fairness report through `GET /model/fairness` (ADR 015), so Jamie's disclosure figures cannot drift between surfaces.
- (2026-09-24) **"It demos fine" is not "it works".** For two stakeholders the headline GenAI features (Azure-written drafts, semantic search in the Methodology bot) had quietly degraded to fallbacks. Business lesson: status reports should state which path ran (`drafter_source`, `retrieval_mode`), not just that a feature responded.
- (2026-09-24) **Sam's what-if must move a real driver.** The slider shown to Sam changed a feature the model barely uses, so the demo implied balance did not matter. It now moves the top SHAP driver (running balance); moving it from 0 to 15,000 takes the flagged customer from 0.75 to 0.0001. Demos that show nothing happening teach the wrong lesson.
- (2026-09-24) **Hosting story for Morgan and Jamie at close:** the API runs in a container locally, with the same controls (no `/send`, role checks, audit, 3.5% cap). Cloud availability is still pending hosting confirmation; nothing in the product claims it is live.
