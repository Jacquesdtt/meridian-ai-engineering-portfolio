# Meridian: from churn ranking to human-reviewed action

**Jacques du Toit · Solo AI engineering course project**

## Problem and scope

A retention team has limited time to contact savings customers. A churn score
alone does not manage the contact queue, review a generated offer, or trace a
decision. Meridian connects those steps in a local application.

The target is next-month churn: a rounded zero balance and no active
transactions. Features use information available through the observation month.
The bank and stakeholder roles form the course scenario. This is a portfolio
demonstration, with no production customer use or measured retention uplift.

This solo project covers data exploration, feature engineering, XGBoost
evaluation, model export, API serving, GenAI drafts, report-grounded Q&A,
human review, tests, and an Azure deployment exercise. A React teaching app
explains the system through interactive exercises. Development used AI coding
assistants; decisions and review work are recorded in the repository.

## Engineering decisions

| Decision | Reason and trade-off | Evidence |
|---|---|---|
| Chronological evaluation | Predict the next month without using future rows in training. One split limits evidence of stability across periods. | [Model card](../Model_Card.md) |
| Capacity threshold from validation | The max-F1 cut creates too much review work. A higher cut reduces the queue but misses many churners. | [Saved comparison](../Sprint2/reports/sprint2_run_summary_v2.json) |
| Portable serving export | Scoring needs no notebook or MLflow database. The preprocessor still needs compatible library versions. | [Model loader](../../src/serving/model.py), [metadata](../../Models/ops/serving_meta.json) |
| API enforces draft rules | The UI cannot bypass server scoring, the offer cap, permissions, or review rules. Demo roles need production authentication before real use. | [API](../../src/serving/app.py), [schemas](../../src/serving/schemas.py) |
| Separate drafts and Q&A | Drafts use controlled prompts. Q&A retrieves evidence from the report. Each path exposes its source or fallback. | [Drafter](../../src/genai/drafter.py), [RAG engine](../../src/genai/rag_engine.py) |
| Human approval and audit history | Approval requires acknowledgement and creates a terminal decision. There is no email-sending endpoint. | [Draft store](../../src/serving/draft_store.py), [API tests](../../tests/serving/test_api.py) |

## Results and limits

The saved test period is September 2017 to April 2020. XGBoost reaches PR-AUC
**0.219**, compared with **0.151** for the churn heuristic. ROC-AUC is **0.723**,
compared with **0.551**. These are historical model results, not a new training
run or evidence of business impact.

At the validation-selected threshold of **0.70055**, test precision is **22.9%**
and recall is **9.0%**. False positives fall from 248,778 at the earlier max-F1
cut to 20,127. The reduction costs recall. The 40% precision goal was not met,
and scores are not calibrated probabilities.

Fairness gaps remain: equalized odds difference is about **0.156 for age** and
**0.318 for state**, on the recorded test sample with groups of at least 500 rows.
Measurement and review do not remove these gaps. See the
[model card](../Model_Card.md) and [run summary](../Sprint2/reports/sprint2_run_summary_v2.json).

The API was deployed to Azure Container Apps and checked on 24 September 2026,
then removed. There is no standing cloud service. Local fixtures support
scoring and review without the original course data.

## Explore the project

1. Read the [README](../../README.md) for the system flow.
2. Follow the [application guide](DEMO_GUIDE.md): score two fixtures, create a draft,
   approve it with acknowledgement, and inspect the audit history.
3. Inspect the [evidence record](EVIDENCE.md) for dated checks and their limits.

## Next production steps

Add authenticated identity, Python/container CI, a repeatable data pipeline,
and monitoring. Test calibration, model improvements, and fairness mitigations
before a customer trial. Revalidate cloud access controls and live LLM behavior.
These are open engineering steps.
