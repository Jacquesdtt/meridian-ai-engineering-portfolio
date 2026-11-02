# ADR 012: Fairness, Approval, and Compliance Guardrails (Risk Sign-off)

## Date
2026-07-17

## Status
Accepted

## Related
[MLflow model selection & registry roadmap](../MLflow_Model_Selection_Roadmap.md) §3.3 / §8 (future work). Making fairness a hard selection gate would require Risk to agree numeric limits and an amendment to Decision 1 below.

## Context
Following the implementation of the "Friction as a Feature" architecture (ADR 003) and Demo Glass-Box RBAC (ADR 007), we sought final sign-off from Jamie (Risk & Compliance) on several open policy questions (JR-OPEN-01 to JR-OPEN-05) regarding fairness measurement, approval workflows, audit capabilities, and access control for the prototype.

The outstanding questions pertained to:
1. Whether fairness measurement required an automated "hard release gate" or if periodic review and disclosure were sufficient.
2. What customer attributes must be checked for bias.
3. Whether the approval workflow required a secondary "send" approval.
4. The required depth of the audit log for a production system.
5. The timeline and necessity for enterprise SSO (Entra ID) vs. the current demo RBAC.

## Decision
Based on the stakeholder consultation (Arvind/Jamie), we have established the following compliance guardrails:

1. **Fairness Measurement (Periodic Review + Disclosure):** We will rely on periodic human-in-the-loop (HITL) review and transparent disclosure of fairness metrics (e.g., Equalized Odds) rather than implementing a hard automated release gate. This prevents brittle deployment blockers caused by minor demographic noise in small datasets.
2. **Protected Attributes:** We will evaluate fairness strictly against the explicitly available protected attributes in our dataset: **Age** and **State**. We will not synthesize or impute proxy variables for other attributes, as this introduces out-of-scope risks and assumptions.
3. **Approval Workflow (Single Approval):** A single HITL approval step is deemed sufficient for the Friction-Gate MVP. Because the GenAI system strictly *drafts* and never *sends* communications (per ADR 003), any future integration with an enterprise mailer will rely on the marketing system's native outbound controls, avoiding duplicate review fatigue within our application.
4. **Audit Logging (Prototype Acceptance):** The current SQLite-backed audit log (tracking actor, action, timestamp, and attention acknowledgement) is accepted as sufficient for the prototype phase. Enterprise-grade auditing (e.g., immutable staff IDs, full prompt/payload hashing, and encrypted long-term retention) is formally deferred to a future production integration phase.
5. **Access Control (Demo RBAC Acceptance):** The pedagogical "Demo RBAC" dropdown is explicitly accepted for the assessor milestone to demonstrate capability. Integration with corporate Entra ID / SSO is formally deferred.

## Consequences
*   **Pros:** Clarifies the boundaries of the prototype, avoiding over-engineering of IAM and audit capabilities. Enables progress by removing ambiguous compliance blockers. Ensures our fairness approach is defensible and grounded in available data.
*   **Cons:** The system remains unsuited for direct connection to live banking systems without further enterprise hardening (IAM, SIEM integration).

## Trade-offs
We are trading enterprise-grade production readiness (SSO, immutable audit ledgers) for delivery speed and conceptual proof of the Risk control plane. This satisfies the pedagogical requirements of the assessor milestone while explicitly documenting the technical debt that must be addressed before production deployment.
