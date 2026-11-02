# Sprint 1: AI Business Partner Learnings

Learnings from the **Sam churn-definition call** and the **post-meeting notebook red-team → revision** loop (Morgan / Jamie framing).

## Sam meeting → product constraints
* **Label is a business decision with DS autonomy on thresholds.** Sam locked the *horizon* (next month) and sense-check (round to nearest currency unit); EDA had to *defend* activity, grace, and 1m vs 2m — not invent a closure flag the data does not have.
* **High-balance dormancy is AUM preserved, not churn.** Quiet + large balance must not be sold to Morgan as “saved churn.”
* **ROC-AUC alone fails Morgan.** Primary success metric is AUM at risk / preserved ([PRD §2](../Product/Product_Requirements_Document.md)), not classification accuracy.

## Red-team → stakeholder-ready numbers
* **Replace placeholders with method + figure.** Old PRD **$4.2M** and §5e **$2.2M** `start_balance` proxy were indefensible. Locked historical AUM-at-risk ≈ **$7.27M** (prior-3-month max `Running_Balance` at first left-looking exit). Always say *how* the dollar was computed.
* **Unpack “11.8% churn” for the room.** Report prevalence **and** first-exit incidence (3.92%), reactivations (~206k), and impending vs already-gone (10.4% vs 22.2%). Otherwise Sam/Morgan hear a unique-customer churn rate that is not what we trained.
* **Ops lead time is a product constraint.** 34% of pre-exit `$0` crosses happen by day 14 of the prior month → scoring must be early in the prediction month or Friction-Gate burns the window (Jamie/Retention).
* **Fairness is a Jamie slide, not a label change.** Age bands are flat (~11–12%); state spread (TX 13.4% vs CA 10.4%) is documented without unlocking ADR 004.
* **Currency narrative:** Use `$` + “round to nearest $1 (Sam sense-check)” on decks — Sam’s “pound” was the rounding metaphor.

## Working with agents / docs
* **Docs before code** after a stakeholder attack: red-team note → revision checklist → notebook → PRD/MEMORY cascade. Mixing “what Sam said” with “what we found attacking ourselves” in one blob loses the audit trail.
* **Do not unlock the label casually.** Only P-07 was `may_unlock_label`; evidence said keep `rounded == 0`.

**Pointers:** [churn_definition.md](churn_definition.md) · [eda_revision_plan.md](eda_revision_plan.md) · [02_eda_notebook_red_team.md](../StakeholderManagement/Meetings/02_eda_notebook_red_team.md) · [ML_Learnings.md](ML_Learnings.md)
