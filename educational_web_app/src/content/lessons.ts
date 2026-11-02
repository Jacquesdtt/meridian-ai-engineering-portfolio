/**
 * Per-module lesson frame: objectives → concept primer (+ per-primer check) →
 * predict-then-reveal → (demo) → cloze scaffold → takeaways + code references.
 * Each lesson also carries estMinutes (honest Learn + Explore + Check estimate)
 * and elevator (the 30-second spoken answer). Numbers come from facts.ts only.
 */
import type { ModuleId } from './modules';
import {
  AUM_AT_RISK,
  DEPLOY,
  GENAI,
  MODEL,
  FAIRNESS,
  RAG_015,
  RAG_CHUNKING,
  REASONING_PARAMS,
  SILENT_FALLBACKS,
  TEMPORAL_SPLIT,
  formatOpsThreshold,
} from './facts';

export interface PrimerCheck {
  /** One-line micro-check answerable purely from this primer's own body text. */
  prompt: string;
  choices: string[];
  correctIndex: number;
  explain: string;
}

export interface Primer {
  title: string;
  body: string[];
  example?: string;
  check?: PrimerCheck;
}

export interface Prediction {
  prompt: string;
  choices: string[];
  correctIndex: number;
  reveal: string;
}

/** Scaffolded "finish the reasoning" step: a sentence with one blank, shown before cold recall. */
export interface Cloze {
  intro?: string;
  /** Exactly one "___" placeholder marks the blank. */
  sentence: string;
  choices: string[];
  correctIndex: number;
  explain: string;
}

export interface Lesson {
  moduleId: ModuleId;
  /** Honest estimate of minutes to work through Learn + Explore + Check for this module. */
  estMinutes: number;
  objectives: string[];
  primers: Primer[];
  predict: Prediction;
  cloze: Cloze;
  /** Further fill-in-the-blank drills, rendered after the main cloze. */
  extraCloze?: Cloze[];
  /** The 30-second spoken answer for this module: what the learner should be able to say out loud. */
  elevator: string;
  takeaways: string[];
  codeRefs: { path: string; why: string }[];
}

export const LESSONS: Lesson[] = [
  {
    moduleId: 'problem',
    estMinutes: 11,
    objectives: [
      'Explain what “silent churn” is and why a bank cannot simply wait for a close flag.',
      `State the ${AUM_AT_RISK.display} AUM-at-risk baseline and how it was measured.`,
      'Name the three stakeholders and the one concern each would push hardest on.',
      'Apply CATWOE, POPIT, and RASCI to map system boundaries, holistic impact, and single-point accountability.',
    ],
    primers: [
      {
        title: 'Silent churn',
        body: [
          'Savings customers rarely close an account. They drain it: the balance falls to zero and transactions stop. By the time anyone notices, the money is gone.',
          'So the project predicts next month’s drain-out from this month’s behaviour, early enough for a retention team to call.',
        ],
        check: {
          prompt: 'Why can’t the bank simply wait for an account-close flag?',
          choices: [
            'Close flags arrive about a month late',
            'Savings customers drain the balance to zero instead of closing',
            'The close flag is not stored in the data',
          ],
          correctIndex: 1,
          explain:
            'Customers rarely close a savings account — the balance falls to zero and transactions stop, so by the time anyone notices the money has gone.',
        },
      },
      {
        title: 'ML ranks, GenAI drafts, humans decide',
        body: [
          'The model only orders customers by risk. A capacity rule picks the top ~5% to contact. GenAI writes a draft email for a flagged customer, and a human must approve it. Nothing is sent by the system.',
        ],
        example: `AUM at risk = sum of each churner’s prior-3-month maximum balance at first exit ≈ ${AUM_AT_RISK.displayExact}.`,
      },
      {
        title: 'CATWOE: System boundary & worldview',
        body: [
          'CATWOE defines who the system is for (Customers: retail savers & retention teams), who operates it (Actors), what changes (Transformation: raw logs into risk ranks & draft outreach), the core philosophy (Worldview: retaining deposits is cheaper than acquisition; AI must augment humans, not replace them), the Owners (Sam for ML, Morgan for ROI, Jamie for compliance), and Environmental constraints (AppLocker, ZDR, 3.5% rate cap).',
        ],
      },
      {
        title: 'POPIT & RASCI: Holistic change and governance',
        body: [
          'POPIT looks beyond Technology to People (combating review fatigue and automation bias), Organisation (cross-functional buy-in and Glass-Box RBAC), Process (Friction-Gate: Approve ≠ Sent), and Information (ZDR PII scrubbing and SQLite audit trails).',
          'RASCI establishes single-point Accountability (A): Sam owns model risk; Morgan owns queue capacity and ROI; Jamie owns regulatory guardrails. Single ownership prevents cross-functional committee deadlock.',
        ],
        check: {
          prompt: 'What is RASCI’s single-point Accountability meant to prevent?',
          choices: [
            'Cross-functional committee deadlock',
            'Duplicate code between notebooks and src/',
            'Overspend on the Azure subscription',
          ],
          correctIndex: 0,
          explain:
            'Each stream has one accountable owner — Sam for model risk, Morgan for queue capacity and ROI, Jamie for guardrails — so a decision is never passed around a committee.',
        },
      },
    ],
    predict: {
      prompt: 'Which stakeholder is most likely to ask “could the AI ever email a customer on its own?”',
      choices: ['Sam (Data Science)', 'Morgan (Product / ops budget)', 'Jamie (Risk & Compliance)'],
      correctIndex: 2,
      reveal: 'Jamie owns HITL, zero-data-retention and audit. Morgan asks about queue size and ROI; Sam asks about leakage and honest metrics.',
    },
    cloze: {
      sentence:
        'Because savings customers drain the balance instead of closing the account, the system has to predict ___ rather than react to a close flag.',
      choices: ['next month’s drain-out', 'last month’s complaint volume', 'the date the account was opened'],
      correctIndex: 0,
      explain: 'The prediction has to land while there is still a balance to save and time for a human to call.',
    },
    elevator: `Meridian’s savings customers don’t close accounts, they drain them, so by the time anything flags the account the money has already gone. We predict next month’s drain-out from this month’s behaviour, rank customers by risk, and contact only the top ~5% that the retention team can actually work. The model ranks and GenAI drafts, but a person approves and a person makes the contact. The ${AUM_AT_RISK.display} figure is a historical baseline of AUM that was at risk, not a forecast of money saved.`,
    takeaways: [
      `${AUM_AT_RISK.display} is a historical baseline, not a forecast of money saved.`,
      'The system’s job is to rank and draft; people contact customers.',
      'Every later design decision maps to one of Jamie, Morgan or Sam.',
      'CATWOE, POPIT, and RASCI prevent project failure by aligning tech delivery with operational reality and single accountability.',
    ],
    codeRefs: [
      { path: 'Docs/Product/Product_Requirements_Document.md', why: 'Problem statement and success criteria' },
      { path: 'Docs/StakeholderManagement/stakeholder_engagement_plan.md', why: 'Full CATWOE, POPIT, and stakeholder strategy' },
      { path: 'Docs/StakeholderManagement/README.md', why: 'Persona ↔ roleplay mapping' },
    ],
  },
  {
    moduleId: 'architecture',
    estMinutes: 7,
    objectives: [
      'Find where training, serving, GenAI and tests live in the repo.',
      'Explain what an ADR is and why this project writes one per structural decision.',
      'Say which files are committed and which must be obtained separately (data, MLflow store).',
    ],
    primers: [
      {
        title: 'Architecture Decision Records',
        body: [
          'An ADR is a short note: context, decision, consequences. It freezes the “why” so a later reader does not undo a decision that had a reason.',
          'ADRs can be amended: ADR 006 got a 2026-09-18 follow-on when the UI switched to calling FastAPI.',
        ],
        check: {
          prompt: 'A decision recorded in an ADR no longer matches the code. What does this project do?',
          choices: [
            'Delete the ADR',
            'Amend the ADR with a dated follow-on',
            'Leave the code and the ADR to disagree',
          ],
          correctIndex: 1,
          explain:
            'ADR 006 got a 2026-09-18 follow-on when the UI switched to calling FastAPI — ADRs are amended rather than silently diverged from.',
        },
      },
      {
        title: 'Notebooks explore, src/ ships',
        body: [
          'Code/Sprint* holds the notebooks and scripts in the order they were written. Production logic graduates into src/ packages with tests. Models/ops/ is the committed model export that serving loads.',
        ],
      },
    ],
    predict: {
      prompt: 'You clone the repo on a new laptop. Which of these is NOT in the clone?',
      choices: ['Models/ops/booster.json', 'StartingFiles/*.csv and mlflow.db', 'Docs/Architecture/ADRs/'],
      correctIndex: 1,
      reveal: 'Raw CSVs, processed data and the MLflow store are gitignored. Serving still works because Models/ops/ is committed (ADR 005).',
    },
    cloze: {
      sentence:
        'A fresh clone can still serve predictions because ___ is committed, even though the raw CSVs and the MLflow store are not.',
      choices: ['Models/ops/', 'StartingFiles/', 'mlflow.db'],
      correctIndex: 0,
      explain: 'Serving loads the portable export, so it never depends on the MLflow database (ADR 005).',
    },
    elevator:
      'The repo is split by intent: Code/Sprint* holds the notebooks in the order they were written, and anything that ships graduates into src/ with tests beside it. Every structural decision has an ADR — context, decision, consequences — so a later reader can see the reason before undoing it, and an ADR gets amended rather than quietly contradicted. Serving loads the committed export in Models/ops/, which is why a fresh clone runs even though the raw data and the MLflow store are gitignored.',
    takeaways: [
      'Read ADRs before changing structure; amend them rather than silently diverging.',
      'Serving depends on Models/ops/, not on the MLflow database.',
      'Docs/Engineering/Corrections_and_Future_Work.md is the register of doc-vs-code fixes.',
    ],
    codeRefs: [
      { path: 'Docs/Architecture/ADRs/', why: 'All 14 decisions' },
      { path: 'CLONE_GUIDE.md', why: 'What a fresh clone needs' },
    ],
  },
  {
    moduleId: 'workflows',
    estMinutes: 6,
    objectives: [
      'Explain the Split-Executor working pattern and why AppLocker forced it.',
      'Distinguish Split-Executor (how people and agents work) from split-brain (a database failure mode).',
      'Run the tests with the right launcher on each kind of machine.',
    ],
    primers: [
      {
        title: 'AppLocker',
        body: [
          'A Windows policy that only lets approved executables run. It blocked .venv\\Scripts\\*.exe wrappers such as pytest.exe, and some native libraries.',
          'The workaround (ADR 001): call the globally installed interpreter and run tools as modules — py -3.13 -m pytest.',
        ],
      },
      {
        title: 'Split-Executor vs split-brain',
        body: [
          'Split-Executor: the coding agent writes files and suggests commands; a human runs them in a real terminal.',
          'Split-brain: two copies of an app each write their own state and diverge. ADR 008 prevents it with one SQLite volume and maxReplicas: 1.',
        ],
        check: {
          prompt: 'Two copies of the app each write their own state and drift apart. Which term is that?',
          choices: ['Split-Executor', 'Split-brain'],
          correctIndex: 1,
          explain:
            'Split-brain is the data-consistency failure ADR 008 prevents with one SQLite volume; Split-Executor is only how the agent and the human divide work.',
        },
      },
    ],
    predict: {
      prompt: 'On a normal (non-AppLocker) laptop with no py launcher, how should you run the tests?',
      choices: ['py -3.13 -m pytest tests -q', 'python -m pytest tests -q inside a venv / uv env', 'Double-click pytest.exe'],
      correctIndex: 1,
      reveal: 'py -3.13 is the Windows launcher used on the AppLocker machine. Elsewhere, activate a venv (or use uv) and call python -m pytest.',
    },
    cloze: {
      sentence:
        'Running tools as ___ instead of through .venv script wrappers is what makes the same test command work on a locked-down machine and a normal one.',
      choices: ['modules (python -m …)', 'scheduled tasks', 'signed .exe shims'],
      correctIndex: 0,
      explain: 'AppLocker blocks the wrapper executables, not the interpreter, so the module form survives the policy.',
    },
    elevator:
      'AppLocker only lets approved executables run, so the venv script shims like pytest.exe were blocked outright. The fix was to call the globally installed interpreter and run tools as modules — py -3.13 -m pytest — which works on the locked-down machine and on an ordinary one. Day to day the working pattern was Split-Executor: the coding agent writes files and proposes commands, and a human runs them in a real terminal. That is a way of working, not split-brain, which is a database failure mode and a different problem entirely.',
    takeaways: [
      'Run tools as modules (python -m …) — it works everywhere and avoids script shims.',
      'Split-Executor is a workflow; split-brain is a data-consistency failure.',
    ],
    codeRefs: [
      { path: 'Docs/Architecture/ADRs/001-global-python-applocker-mitigation.md', why: 'Why py -3.13 -m' },
      { path: 'Docs/Architecture/ADRs/008-split-brain-state.md', why: 'Why maxReplicas: 1' },
    ],
  },
  {
    moduleId: 'data',
    estMinutes: 9,
    objectives: [
      'Define the churn label precisely, including what is NOT churn.',
      'Explain observation month t vs label month t+1 and why features must stop at t.',
      'Explain why the data is split by time, not shuffled.',
      'State the one-decision-making-exposure rule and say exactly which repeat is safe and which is leakage.',
    ],
    primers: [
      {
        title: 'The temporal leakage wall',
        body: [
          'Draw a vertical line at the end of the observation month t. Everything a feature is allowed to know sits to the left of it. Everything the label describes sits to the right, in month t+1. The wall is the whole of temporal rigour in one picture.',
          'The wall is not about which columns look suspicious. It is about when a value becomes knowable. Running_Balance at month t is fine even though it almost gives the label away, because in production you genuinely have it before t+1 happens. A three-month rolling mean that includes t+1 is fatal even though it looks innocent, because in production that value does not exist yet.',
          'So the test for any candidate feature is one question: at the moment of scoring, in production, before the label exists — could I compute this? If yes, it is to the left of the wall. If no, it has crossed backwards and the model is being trained on the answer.',
        ],
        example: 'Month t = 2018-03: features may use 2018-03 and earlier. The label reads 2018-04. Nothing in the feature row may have been produced in April.',
        check: {
          prompt: 'Which question settles whether a feature is on the safe side of the wall?',
          choices: [
            'Is it strongly correlated with the label?',
            'Could I compute it at scoring time in production, before the label exists?',
            'Does it come from the same table as the label?',
          ],
          correctIndex: 1,
          explain:
            'Leakage is a timing property, not a correlation strength or a table of origin. gone_this_month is nearly the label and is still safe, because it is a month-t observation.',
        },
      },
      {
        title: 'One decision-making exposure',
        body: [
          'The old slogan is “use the test set once”, which is almost right and confuses everybody the first time they re-run a script. The precise rule is one decision-making exposure: the whole pipeline — model, fitted preprocessor and threshold — is frozen before the test window is scored, and no decision flows backwards from the result.',
          'Re-running identical frozen code over the test set is safe computation. The job crashed, a reviewer wants to reproduce the metric card, you are chasing a bug: the same inputs give the same number and nothing has learned anything.',
          'The violation is a feedback loop. You look at test AUC, change max_depth or the threshold because of what you saw, and evaluate again. Now the holdout has quietly become a tuning signal and the number it reports is no longer an estimate of unseen performance. Meridian avoids this by tuning and choosing the threshold on the validation window only.',
        ],
        example: `Threshold rule derived on validation ${TEMPORAL_SPLIT.val}; the frozen pipeline then scored ${TEMPORAL_SPLIT.test} for the reported card.`,
        check: {
          prompt: 'A pipeline run crashes halfway; you re-run the identical frozen code over the test set. What have you done?',
          choices: [
            'Invalidated the holdout — it has now been seen twice',
            'Nothing: identical code on identical data is repeated computation, not repeated feedback',
            'Halved the effective test size',
          ],
          correctIndex: 1,
          explain:
            'Repeating the computation changes nothing. What contaminates a holdout is a result influencing a change that is then checked against the same holdout.',
        },
      },
      {
        title: 'Temporal leakage',
        body: [
          'Leakage is when a feature contains information that would not exist at prediction time. The model looks brilliant in testing and fails in production.',
          'In monthly data the classic leak is using month t+1 values (or rolling windows that include t+1) as features for a label about t+1.',
        ],
        example: 'Lags use shift(1) before rolling, so Balance_Roll3_Mean at month t only sees t-1, t-2, t-3.',
        check: {
          prompt: 'What makes a feature leaky?',
          choices: [
            'It correlates very strongly with the label',
            'It carries information that would not exist at prediction time',
            'It has missing values in the earliest months',
          ],
          correctIndex: 1,
          explain:
            'Leakage is about timing, not strength of correlation — that is why the leaky model looks brilliant in testing and fails in production.',
        },
      },
      {
        title: 'Why split by time',
        body: [
          `A random shuffle puts 2019 rows in training and 2016 rows in test, so the model learns from the future. Meridian fits on ${TEMPORAL_SPLIT.fit}, tunes on ${TEMPORAL_SPLIT.val}, and tests once on ${TEMPORAL_SPLIT.test}.`,
          'It is one chronological split. There are no cross-validation folds.',
        ],
        check: {
          prompt: 'What goes wrong if the rows are shuffled before splitting?',
          choices: [
            'The classes become more imbalanced',
            'Later months land in training, so the model learns from the future',
            'The test window becomes too short to measure',
          ],
          correctIndex: 1,
          explain:
            'A shuffle puts 2019 rows in training and 2016 rows in test; the chronological split fits, tunes and tests in the order time actually ran.',
        },
      },
    ],
    predict: {
      prompt: 'A customer has $40,000 and made zero transactions this month. Is that churn under ADR 004?',
      choices: ['Yes — inactivity is churn', 'No — churn needs next month’s rounded balance to be 0 and no activity', 'Only if they are over 65'],
      correctIndex: 1,
      reveal: 'High-balance dormancy keeps AUM at the bank, so it is not churn. The label needs both zero rounded balance and zero active transactions in t+1.',
    },
    cloze: {
      intro: 'One line covers the whole feature-engineering rule.',
      sentence: 'Lags are shifted before rolling so that a feature for month t never contains ___.',
      choices: ['information from month t+1', 'the customer’s demographics', 'the model’s own score'],
      correctIndex: 0,
      explain: 'The label is the state of t+1, so anything a feature knows about t+1 is the answer leaking backwards.',
    },
    extraCloze: [
      {
        intro: 'Why the split has to follow the calendar.',
        sentence:
          'A customer panel must be split chronologically rather than shuffled, because a random shuffle puts later months in training and so lets the model ___.',
        choices: [
          'learn patterns from the future it will not have in production',
          'see too many churners relative to the base rate',
          'overweight customers with long account histories',
        ],
        correctIndex: 0,
        explain:
          'Shuffling breaks the ordering the problem actually has. Rows are customer-months, not independent draws: 2019 behaviour in training and 2016 in test means the model is scored on a past it has already been shown the future of, and the estimate flatters a model that will fail live.',
      },
      {
        intro: 'The rule people misquote most often.',
        sentence:
          'The test set is not merely "used once": the pipeline is frozen before test evaluation, so the thing that must never be repeated is ___.',
        choices: [
          'a test result feeding back into a tuning decision',
          'running the scoring script a second time',
          'reporting more than one metric from the run',
        ],
        correctIndex: 0,
        explain:
          'Repeated computation is free. Repeated feedback is the leak: once a test number changes what you ship, the holdout has become part of the training signal.',
      },
    ],
    elevator:
      'Churn here is a state of the following month: the rounded balance is zero and there were no active transactions. A high balance sitting dormant is not churn, because the bank still holds the money. Features are built only from what is known at the observation month — lags are shifted before rolling so nothing from the label month leaks in — and the data is split chronologically. Tuning and the threshold happen on validation; the whole pipeline is then frozen and the test window scored once. That is the rule I would state precisely: one decision-making exposure, not simply “used once” — re-running the same frozen code is harmless, but letting a test result change a hyperparameter is leakage.',
    takeaways: [
      'Label = state of t+1; features = what is known at t.',
      'gone_this_month (zero and inactive in t) is a feature and the baseline heuristic, not the label — they agree only ~82% of the time.',
      'Chronological fit / validation / test. One decision-making exposure: the pipeline is frozen before test evaluation, and no tuning feedback loop runs off the result.',
    ],
    codeRefs: [
      { path: 'Docs/Architecture/ADRs/004-churn-target-and-predictive-window.md', why: 'Label lock' },
      { path: 'Docs/Data/Data_Dictionary.md', why: 'Every feature and its time window' },
      { path: 'Code/Sprint1/02_feature_engineering.ipynb', why: 'Where lags and rolls are built' },
    ],
  },
  {
    moduleId: 'ml',
    estMinutes: 12,
    objectives: [
      'Explain why accuracy is misleading at an ~12% base rate and what PR-AUC measures instead.',
      'Separate “is the ranking good?” from “where do we cut the list?”.',
      'Explain why max-F1 was rejected and why the 40% precision target was unreachable.',
      'Read a SHAP bar chart and say what it does and does not tell you.',
      'Walk the nine-stage progression from business problem to GenAI without skipping a rung.',
      'Explain gradient boosting in loss / gradient / leaf-weight / learning-rate terms, and why it is not epochs and minibatches.',
    ],
    primers: [
      {
        title: 'The nine-stage progression',
        body: [
          'Everything in this project sits on one ladder, and most confused answers are a rung skipped. 1. Problem: silent drain-out costs the bank balances. 2. Information boundary: what is knowable at month t. 3. Generalisation: will this hold on months nobody trained on. 4. Training: gradient-boosted trees minimising a loss. 5. Evaluation: PR-AUC and ROC-AUC against a realistic heuristic. 6. Decision policy: where to cut the ranked list. 7. Risk and explanation: SHAP, fairness, what we disclose. 8. Production: the serving contract and its single enforcement point. 9. GenAI: drafting behind a friction gate.',
          'The ladder also tells you who owns each rung. Stages 1 and 6 are business decisions, 2 to 5 and 7 are Sam’s, 8 and 9 are engineering. An answer that defends a threshold with an AUC has slid from stage 6 back to stage 5 and lost the argument.',
        ],
        check: {
          prompt: 'Which stage does “we contact the top 5% because that is what the team can review” belong to?',
          choices: ['Stage 5, evaluation', 'Stage 6, decision policy', 'Stage 3, generalisation'],
          correctIndex: 1,
          explain:
            'Capacity is a decision-policy question owned by the budget holder. Evaluation tells you how good the ranking is; it cannot tell you where to draw the line.',
        },
      },
      {
        title: 'Why trees and gradient boosting',
        body: [
          'There are no epochs, no minibatches and no backpropagation here. Boosting builds an additive model: start from a base score, then add one decision tree at a time, each one correcting what the ensemble so far got wrong. Nothing already in the ensemble is revised.',
          'Concretely: a loss function scores the current ensemble (log-loss, for binary:logistic). Differentiating it row by row gives a gradient and a second derivative, the hessian. The next tree groups rows with similar gradients, and each leaf weight is the negative gradient sum over the hessian sum plus regularisation. That weight is the correction the tree proposes.',
          'The correction is then multiplied by the learning rate η before being added. η does not change what the tree learned; it decides how much of it you trust. Small η means gradual corrections, so a tree that fitted noise cannot drag the ensemble far — but you need more trees to arrive. Large η jumps toward the target fast and then oscillates, because whatever noise a tree fitted is applied at nearly full weight.',
          'Trees are the right family here because the data is heterogeneous tabular banking data: mixed scales, missing values, and thresholds that matter (balance near zero) rather than smooth gradients. That is the regime where boosted trees still beat deep networks, and TreeExplainer gives Risk exact SHAP attributions for free.',
        ],
        example: 'Prediction after k rounds = base + η×Tree₁ + η×Tree₂ + … + η×Tree_k.',
        check: {
          prompt: 'You cut the learning rate by a factor of ten and leave the number of boosting rounds unchanged. What happens?',
          choices: [
            'The model overfits, because each tree is now more precise',
            'The ensemble underfits: it takes too small a step per round to reach the loss it would otherwise reach',
            'Νothing — η and the round count cancel out',
          ],
          correctIndex: 1,
          explain:
            'η and the number of rounds trade off against each other. Shrinking one without growing the other stops the ensemble short of the optimum, which shows up as underfitting rather than better regularisation.',
        },
      },
      {
        title: 'Score vs calibrated probability',
        body: [
          'A calibrated probability means something testable: take every customer scored 0.30 and about 30% of them should churn. Meridian’s scores do not pass that test and were never trained to.',
          `Training used scale_pos_weight to up-weight the ${(MODEL.baseRate * 100).toFixed(1)}% minority class. That changes the loss so a churner counts for many non-churners, and the ensemble is rewarded for separating the classes rather than for matching observed frequencies. Better ranking is exactly what was asked for; a distorted output distribution is the price.`,
          `The evidence is in the validation slices: even the top 1% of scores is only about ${Math.round(MODEL.top1PctPrecision * 100)}% precise. If the scores were probabilities, a bucket up near 0.9 would be roughly 90% precise.`,
          'So the defensible sentence is “this customer sits high on an uncalibrated ranking score”, not “this customer has an 80% chance of churning”. The API field is named churn_probability, which is legacy naming debt from before this was settled — documented rather than silently renamed, because the contract is published. Calibration (Platt scaling or isotonic regression on a held-out slice) is future work, not a shipped feature.',
        ],
        check: {
          prompt: 'Why can a score of 0.80 not be read as an 80% chance of churn?',
          choices: [
            'Because 80% is above the ops threshold, so it is already a decision',
            'Because scale_pos_weight and a ranking objective distort the output distribution away from observed frequencies',
            'Because probabilities are only meaningful over a full year, not one month',
          ],
          correctIndex: 1,
          explain:
            'Class weighting buys separation and costs calibration. The number orders the queue; it does not estimate a frequency.',
        },
      },
      {
        title: 'Imbalanced classes and PR-AUC',
        body: [
          `Only ${(MODEL.baseRate * 100).toFixed(1)}% of rows churn. A model that always says “no” is ${((1 - MODEL.baseRate) * 100).toFixed(1)}% accurate and useless.`,
          'Precision = of the people we flag, how many really churn. Recall = of the churners, how many we flag. PR-AUC averages precision across all recall levels, so it rewards putting churners at the top of the list. A random ranking scores about the base rate (~0.12).',
          'ROC-AUC is the chance that a random churner is ranked above a random non-churner (0.5 = coin flip). It can look fine even when the top of the list is mostly false alarms, which is why PR-AUC leads here.',
        ],
        example: `Model PR-AUC ${MODEL.prAuc.model} vs heuristic ${MODEL.prAuc.heuristic}; ROC-AUC ${MODEL.rocAuc.model} vs ${MODEL.rocAuc.heuristic}.`,
        check: {
          prompt: 'Roughly what PR-AUC does a random ranking score on this data?',
          choices: ['0.5, the same as a coin flip', 'About the base rate, ~0.12', 'Zero'],
          correctIndex: 1,
          explain:
            'PR-AUC’s no-skill line is the base rate. It is ROC-AUC where a coin flip scores 0.5, which is part of why PR-AUC leads here.',
        },
      },
      {
        title: 'A threshold is a business decision',
        body: [
          'The model outputs scores; the threshold turns scores into “contact / don’t contact”. Moving it trades recall for queue size. It does not change PR-AUC.',
          'scale_pos_weight up-weights churners during training. That helps ranking but means a score of 0.70 is not a 70% probability. Scores are ranks.',
        ],
      },
      {
        title: 'SHAP in one paragraph',
        body: [
          'For one prediction, SHAP splits the difference between that score and the average score into a contribution per feature (in log-odds for XGBoost). Averaging the absolute contributions over many rows gives a global importance ranking.',
          'Global importance says what the model relies on overall. It does not explain an individual customer, and it is not causation.',
        ],
        check: {
          prompt: 'A global SHAP bar chart puts Running_Balance_Rounded on top. What have you learned?',
          choices: [
            'That feature causes customers to churn',
            'The model relies on it most, averaged over many rows',
            'Why one particular flagged customer was scored highly',
          ],
          correctIndex: 1,
          explain:
            'Averaging absolute contributions gives overall reliance. It is not causation, and it does not explain an individual customer.',
        },
      },
    ],
    predict: {
      prompt: `If you lower the threshold from ${formatOpsThreshold()} to the max-F1 value ${MODEL.maxF1Threshold}, what happens to false positives on test?`,
      choices: ['They roughly halve', 'They grow about 12×', 'They stay the same — PR-AUC did not change'],
      correctIndex: 1,
      reveal: `${MODEL.opsFalsePositives.toLocaleString()} → ${MODEL.maxF1FalsePositives.toLocaleString()}. Max-F1 flags almost everyone (recall ≈ ${MODEL.maxF1Recall}). PR-AUC is unchanged because ranking did not change.`,
    },
    cloze: {
      sentence:
        'Moving the threshold changes the size of the queue but not PR-AUC, because the threshold does not change ___.',
      choices: ['the order of the ranked list', 'the base rate of churn', 'which features the model uses'],
      correctIndex: 0,
      explain: 'PR-AUC scores the ranking; the cut only decides how far down that fixed ranking the team goes.',
    },
    elevator: `At a base rate of about ${(MODEL.baseRate * 100).toFixed(1)}%, accuracy is the wrong metric — a model that never flags anyone still looks accurate and catches nobody. So the ranking is judged with PR-AUC, which rewards putting real churners at the top of the list: ${MODEL.prAuc.model} against ${MODEL.prAuc.heuristic} for the gone-this-month heuristic on a time-based holdout. That is the modelling win, and it is where the modelling win stops. Where to cut the ranked list is a separate, operational decision: the ${Math.round(MODEL.precisionFloorTarget * 100)}% precision floor proved unreachable, so we contact the top ~5% the retention team can actually work, which drops false positives from ${MODEL.maxF1FalsePositives.toLocaleString()} to ${MODEL.opsFalsePositives.toLocaleString()} and leaves PR-AUC untouched — because moving the cut does not reorder the list. The scores are ranks, not calibrated probabilities, so I would not turn one into a percentage chance.`,
    takeaways: [
      'Two questions: ranking quality (PR-AUC, beats the heuristic) and contact policy (capacity cut).',
      `The 40% precision floor was infeasible (top 1% ≈ ${Math.round(MODEL.top1PctPrecision * 100)}%), so the top-5% capacity rule was used — and documented.`,
      'Scores are ranks, not probabilities; calibration is future work, and churn_probability is a named API debt.',
      'Boosting = base score + η × each tree’s leaf weights, where leaf weights come from loss gradients. Lower η with fixed rounds underfits.',
      'Model quality ≠ decision threshold ≠ operational policy ≠ business capacity.',
      'Running_Balance_Rounded dominates global SHAP.',
    ],
    codeRefs: [
      { path: 'Code/Sprint2/01_modeling_and_rai.ipynb', why: 'Training, threshold rules, SHAP, fairness' },
      { path: 'Docs/Sprint2/ML_Learnings.md', why: '§2.4a: why 40% precision was unreachable' },
      { path: 'Models/ops/serving_meta.json', why: 'Frozen threshold, feature list, top_shap' },
    ],
  },
  {
    moduleId: 'serving',
    estMinutes: 8,
    objectives: [
      'Draw the path Streamlit → FastAPI → SQLite and say which component enforces each rule.',
      'Explain why the API re-scores raw features instead of trusting a client score.',
      'Explain the http vs inprocess modes and why the fallback exists.',
    ],
    primers: [
      {
        title: 'Single enforcement point',
        body: [
          'If two code paths can create a draft, the rules are only as strong as the weaker path. So every rule (role check, re-score, threshold gate, rate cap, audit) lives in the FastAPI app, and the UI only talks to it.',
          'Pydantic request models with extra="forbid" reject unknown fields, so a client cannot slip in its own score.',
        ],
        check: {
          prompt: 'What does extra="forbid" on the request models buy?',
          choices: [
            'Faster JSON parsing',
            'Unknown fields are rejected, so a client cannot slip in its own score',
            'Missing fields get sensible defaults',
          ],
          correctIndex: 1,
          explain:
            'Rejecting unknown fields keeps scoring under the server’s control, which is the whole point of having one enforcement path.',
        },
      },
      {
        title: 'In-process ASGI',
        body: [
          'FastAPI is an ASGI app: a Python callable that handles requests. A test client can call it directly in the same process, with no network socket. That keeps one set of rules while working around blocked localhost HTTP.',
        ],
        check: {
          prompt: 'What does inprocess mode remove, and what does it keep?',
          choices: [
            'Removes the network socket, keeps the same API and its rules',
            'Removes the API, keeps a lighter copy of the rules in the UI',
            'Removes SQLite, keeps the HTTP routes',
          ],
          correctIndex: 0,
          explain:
            'The client calls the ASGI callable directly in the same process, so blocked localhost HTTP is worked around without a second set of rules.',
        },
      },
    ],
    predict: {
      prompt: 'A client sends POST /drafts with a customer whose re-computed score is below the threshold. What happens?',
      choices: ['A draft is created with a warning', '422 — no LLM call, no draft', 'The client’s own score is used instead'],
      correctIndex: 1,
      reveal: `The API re-scores from raw features and refuses unless ${formatOpsThreshold('p-gate')}. No draft, no LLM cost.`,
    },
    cloze: {
      sentence: 'The API re-scores every request from raw features so that a client cannot ___.',
      choices: [
        'supply its own score to get past the gate',
        'choose which model version runs',
        'read drafts belonging to another role',
      ],
      correctIndex: 0,
      explain: 'The gate is only meaningful if the number it checks was computed by the server.',
    },
    elevator:
      'Everything flows one way: Streamlit talks to a small client, the client talks to FastAPI, and only FastAPI writes to SQLite. Every rule sits at that one point — the role check, re-scoring from raw features, the threshold gate, the rate cap and the audit write — because if two paths could create a draft, the rules would only be as strong as the weaker one. Pydantic models forbid unknown fields, so a client cannot hand in its own score. When localhost HTTP is blocked the UI switches to in-process mode, which calls the same ASGI app directly rather than reimplementing anything.',
    takeaways: [
      'UI → client.py → FastAPI → SQLite. Only the API writes.',
      'inprocess mode runs the same API, not a copy of the rules.',
      'Still open: demo-header roles and a shared SQLite credential.',
    ],
    codeRefs: [
      { path: 'src/serving/app.py', why: 'Routes, role checks, re-score gate' },
      { path: 'src/serving/client.py', why: 'FrictionGateClient (http / inprocess)' },
      { path: 'tests/serving/test_friction_gate_client.py', why: 'Guards against UI bypassing the API' },
    ],
  },
  {
    moduleId: 'friction',
    estMinutes: 8,
    objectives: [
      'Explain automation bias and how “friction” counters it.',
      'List what each demo role can and cannot do.',
      'Explain why Approve does not send, and what a fast approval triggers.',
    ],
    primers: [
      {
        title: 'Human-in-the-loop and automation bias',
        body: [
          'People tend to accept machine suggestions without checking, especially under time pressure. A review step that is one click becomes a rubber stamp.',
          'Friction-Gate adds deliberate friction: an attention acknowledgement on every Approve, a soft warning when a decision is suspiciously fast, and an audit trail Compliance can read.',
        ],
        check: {
          prompt: 'What is the problem with a review step that is one click?',
          choices: [
            'It is slower than reading the raw data',
            'People accept the suggestion without checking, so review becomes a rubber stamp',
            'It cannot be written to the audit trail',
          ],
          correctIndex: 1,
          explain:
            'Automation bias is strongest under time pressure, so the Approve path carries an attention acknowledgement instead of a single click.',
        },
      },
      {
        title: 'Why a soft warning, not a block',
        body: [
          `Approving within ${GENAI.fastDecideSeconds} s records fast_decide_warn in the audit detail. Hard blocks tend to produce workarounds (waiting, then clicking anyway), which hides the behaviour instead of surfacing it.`,
        ],
        check: {
          prompt: 'Why is a very fast approval warned about rather than blocked?',
          choices: [
            'Blocking would break the audit trail',
            'Hard blocks produce workarounds that hide the behaviour',
            'The timer is not accurate enough to block on',
          ],
          correctIndex: 1,
          explain:
            'A reviewer who is forced to wait simply waits and then clicks anyway; recording fast_decide_warn surfaces the behaviour instead.',
        },
      },
    ],
    predict: {
      prompt: 'The Compliance viewer clicks Approve. What happens?',
      choices: ['The draft is approved and flagged for audit', '403 — and the denial itself is written to the audit log', 'Nothing; the button is only hidden'],
      correctIndex: 1,
      reveal: 'The API enforces X-Demo-Role: compliance_viewer can read everything and approve nothing. Denials are audited too.',
    },
    cloze: {
      sentence:
        'A suspiciously fast approval is ___ rather than blocked, because a hard block would push the behaviour out of sight.',
      choices: ['recorded in the audit detail', 'silently discarded', 'rejected with a 403'],
      correctIndex: 0,
      explain: 'The aim is to surface rubber-stamping, not to make it invisible by forcing people to wait first.',
    },
    elevator:
      'People rubber-stamp machine suggestions when review is one click, especially under time pressure — that is automation bias. So the review step is deliberately slowed: an attention acknowledgement on every Approve, a soft warning written to the audit detail when a decision comes back suspiciously fast, and a trail Compliance can read. Approve does not mean sent; there is no send route at all, and the actual outreach happens outside the system. Compliance can view everything and approve nothing, and even that refusal is audited.',
    takeaways: [
      'Approve ≠ Sent: there is no /send route; outreach happens outside the system.',
      'Roles are a demo header (ADR 007), not real identity — Entra ID is future work.',
      'Fast approvals are logged, not blocked.',
    ],
    codeRefs: [
      { path: 'Code/Sprint3/friction_gate_app.py', why: 'Review UI' },
      { path: 'src/serving/attention_gate.py', why: 'High-stakes cue and fast-decide window' },
      { path: 'src/serving/rbac.py', why: 'Role permissions' },
    ],
  },
  {
    moduleId: 'genai',
    estMinutes: 12,
    objectives: [
      'Trace a draft: scrub context → prompt → LLM → scrub output → clamp rate → store for review.',
      'Explain why LLM output is validated with a schema rather than trusted.',
      'Say what the PII scrubber catches and what it misses.',
      `Explain why the code picks request parameters per model since the move to ${GENAI.chatModel}.`,
    ],
    primers: [
      {
        title: 'Structured output',
        body: [
          'The LLM is asked for JSON (subject, body, offered_interest_rate). Pydantic parses it into a typed model. Anything that does not fit is rejected before it reaches a person.',
          `Business rules are enforced in code, not in the prompt: the rate is clamped to ${GENAI.rateCapDisplay} with min(rate, ${GENAI.rateCap}), and the driver list is replaced with the server’s own SHAP names.`,
        ],
      },
      {
        title: 'Prompt templates (.prompty)',
        body: [
          'The prompt lives in a versioned template file with its declared model settings (temperature 0.2, max_tokens 800), not in a Python string. prompty is pinned below 2.0 because 2.x cannot render this file.',
          'Declared is not the same as sent. The drafter builds the API call itself, and it has never passed the temperature on, so the 0.2 is documentation rather than a live setting.',
        ],
        check: {
          prompt: 'Where are the prompt and its declared model settings versioned?',
          choices: [
            'In a Python string inside the drafter',
            'In the versioned .prompty template, next to the prompt',
            'In the Pydantic draft schema',
          ],
          correctIndex: 1,
          explain:
            'Prompt and declared settings are versioned together in the template file, which is also why prompty is pinned below 2.0. Whether a setting is actually sent is decided in drafter.py.',
        },
      },
      {
        title: `Reasoning models take different parameters (${GENAI.chatModel})`,
        body: [
          `The Azure chat deployment moved from ${GENAI.chatModelBefore} to ${GENAI.chatModel}, a reasoning model. ${REASONING_PARAMS.why}`,
          `${REASONING_PARAMS.helper} handles it in one place. ${REASONING_PARAMS.rule} The drafter now asks for up to ${REASONING_PARAMS.budgets[0].reasoning} completion tokens instead of ${REASONING_PARAMS.budgets[0].classic}.`,
          `How it was found: ${SILENT_FALLBACKS[0].symptom.toLowerCase()}. The fallback design worked exactly as intended, which is why nothing looked broken. The signal was ${SILENT_FALLBACKS[0].signal}.`,
        ],
        example: 'max_tokens=800 → HTTP 400 on gpt-5-mini (not retried: a 400 is not transient) → stub drafts it → drafter_source = stub_fallback',
        check: {
          prompt: `Drafts keep arriving with drafter_source = stub_fallback after the switch to ${GENAI.chatModel}. What is the first thing to check?`,
          choices: [
            'Whether the PII scrubber removed the whole prompt',
            'Whether the request uses parameters the new model rejects, such as max_tokens',
            'Whether the 3.5% rate clamp is failing validation',
          ],
          correctIndex: 1,
          explain:
            'stub_fallback means Azure was configured but never returned a draft. A parameter the new model rejects produces exactly that, and the retry-then-stub design hides it unless you read drafter_source.',
        },
      },
      {
        title: 'Zero data retention (ZDR)',
        body: [
          'Before the call: blocked keys (name, customer_id, email, phone, dob…) are dropped and regexes redact emails, phones, SSNs, ISO dates and 8+ digit IDs. After the call: subject and body are scrubbed again.',
          'Free-text names are not detected, so notes fields remain a residual risk.',
        ],
        check: {
          prompt: 'Which of these is the scrubber least likely to catch?',
          choices: [
            'An email address in a context field',
            'A customer name typed into a free-text note',
            'A date of birth under the dob key',
          ],
          correctIndex: 1,
          explain:
            'Blocked keys and regexes handle named fields and recognisable patterns; free-text names are not detected, which is the stated residual risk.',
        },
      },
    ],
    predict: {
      prompt: 'The LLM returns offered_interest_rate = 0.05. What is stored?',
      choices: ['The draft is rejected and the LLM is asked again', '0.035 — the rate is clamped', '0.05 with a warning for the reviewer'],
      correctIndex: 1,
      reveal: 'sanitize_llm_draft clamps it. Pydantic only rejects values that somehow arrive unclamped. There is no redraft loop.',
    },
    cloze: {
      sentence:
        `The offered rate is ___ in code rather than requested in the prompt, so no wording the model produces can raise it above ${GENAI.rateCapDisplay}.`,
      choices: ['clamped', 'logged', 'renegotiated'],
      correctIndex: 0,
      explain: 'A prompt is a request; the clamp is the rule, with Pydantic as the backstop behind it.',
    },
    elevator: `The drafter scrubs the context before anything leaves the building, asks the model for JSON, and parses the reply into a typed Pydantic model, so anything malformed is rejected before a person ever sees it. The business rules live in code rather than in the prompt: the offered rate is clamped to ${GENAI.rateCapDisplay} and the driver names are replaced with the server’s own SHAP list. The output is scrubbed again, then it sits in the queue for a human to approve. The prompt itself is a versioned template file with its model settings, not a Python string.`,
    takeaways: [
      'Azure when configured; stub offline; stub_fallback after retries fail — recorded on every draft.',
      'The drafter uses frozen global SHAP driver names and no RAG.',
      'Scrub in, scrub out, clamp, then a human approves.',
      `A fallback that always works can hide a real outage: after the move to ${GENAI.chatModel}, read drafter_source, not "the queue still fills".`,
    ],
    codeRefs: [
      { path: 'src/genai/drafter.py', why: 'create_draft, sanitize_llm_draft, retries' },
      { path: 'src/genai/azure_client.py', why: 'chat_limit_params (per-model token limits), key fallback, endpoint normalising' },
      { path: 'src/genai/pii_scrubber.py', why: 'Blocked keys and regexes' },
      { path: GENAI.promptyPath, why: 'The prompt template' },
    ],
  },
  {
    moduleId: 'rag',
    estMinutes: 11,
    objectives: [
      'Explain retrieval-augmented generation in three steps: chunk, embed, retrieve.',
      'Explain cosine similarity and why chunk size matters.',
      'Explain hybrid retrieval: BM25 and embeddings ranked separately, fused with RRF, then reranked (ADR 015).',
      'Explain why Meridian ranks in pure Python instead of using a vector database.',
      'Explain why chunk size and boundaries decide retrieval precision, using the Sprint 5 chunking bug.',
    ],
    primers: [
      {
        title: 'RAG in three steps',
        body: [
          `1. Split the document into chunks (here: by markdown headings, then paragraphs packed up to ${GENAI.ragChunkMaxChars} characters). 2. Turn each chunk into an embedding vector (Azure text-embedding-3-large). 3. At question time, embed the question and return the top ${GENAI.ragTopK} most similar chunks for the LLM to answer from.`,
        ],
        check: {
          prompt: 'At question time, what gets embedded?',
          choices: ['Every chunk, again', 'The question', 'The answer, so it can be checked'],
          correctIndex: 1,
          explain:
            'Chunks are embedded up front; embedding the question at query time is what makes the closest chunks findable.',
        },
      },
      {
        title: 'Meridian’s chunking lesson',
        body: [
          `The first version of the retriever split the Official report on # and ## only. That produced about ${RAG_CHUNKING.beforeChunks} chapter-sized chunks, the largest near ${RAG_CHUNKING.beforeMaxChars.toLocaleString()} characters. Asking for the top ${RAG_CHUNKING.topK} then handed the model roughly ${Math.round(RAG_CHUNKING.beforeCoverage * 100)}% of the whole report. The demo expander looked like someone had pasted a chapter, because effectively they had.`,
          'Nothing was wrong with the embeddings, the similarity maths or top_k. The retrieval step was doing its job perfectly over units that were too coarse to be evidence. A chunk is the smallest thing retrieval can choose, so chunk boundaries set the floor on how precise an answer can be.',
          `The fix was structural: split on # through ###### so each heading level starts a chunk, then pack paragraphs up to ${RAG_CHUNKING.afterMaxChars} characters. That gave ${RAG_CHUNKING.afterChunks} chunks, and the same top-${RAG_CHUNKING.topK} query now returns about ${(RAG_CHUNKING.afterCoverage * 100).toFixed(1)}% of the report — targeted evidence instead of a chapter.`,
          'The cache carries a schema_version for exactly this reason: when the meaning of a chunk changes, stale indexes must be rejected rather than silently reused, or you keep serving the old retrieval behaviour from disk.',
        ],
        example: `${RAG_CHUNKING.beforeChunks} coarse chunks → ~${Math.round(RAG_CHUNKING.beforeCoverage * 100)}% coverage; ${RAG_CHUNKING.afterChunks} heading-aware chunks → ~${(RAG_CHUNKING.afterCoverage * 100).toFixed(1)}%. Same embeddings, same top_k.`,
        check: {
          prompt: 'Retrieval returns the top 3 chunks and the answer is still vague and over-broad. What is the first thing to suspect?',
          choices: [
            'The embedding model is too small',
            'The chunks are too coarse, so three of them cover much of the document',
            'top_k should be raised to 10',
          ],
          correctIndex: 1,
          explain:
            'Chunk semantics set the floor on retrieval precision. Raising top_k on coarse chunks makes the dilution worse, and the embedding model was never the problem.',
        },
      },
      {
        title: 'Cosine similarity',
        body: [
          'Two vectors pointing the same way score 1, unrelated ones score near 0. For one report’s worth of chunks, a plain Python loop is fast enough — no index structure needed.',
          'If embeddings are unavailable (offline), the BM25 keyword ranking is used on its own, so the demo still answers. The API still labels that mode retrieval_mode = tfidf, a name kept from before ADR 015.',
        ],
        check: {
          prompt: 'Embeddings cannot be produced because the demo is offline. What happens?',
          choices: [
            'The Q&A returns nothing',
            'The BM25 keyword ranking is used on its own',
            'The whole document is pasted into the prompt',
          ],
          correctIndex: 1,
          explain: 'Losing the dense signal degrades retrieval to keywords; it never stops the bot answering (ADR 015).',
        },
      },
      {
        title: 'Hybrid retrieval and rerank (ADR 015)',
        body: [
          `Since September 2026 each question is ranked two ways. Okapi BM25 scores exact keyword overlap, which catches names like “0.701” or “ADR 008”. ${GENAI.embeddingModel} embeddings score meaning, which catches paraphrases.`,
          'Reciprocal Rank Fusion combines the two lists by position, not by score: a chunk near the top of either list rises. That avoids normalising two scores that are on different scales.',
          `The chat deployment then reranks the fused shortlist in one call, reading the question and each chunk together, and the top ${GENAI.ragTopK} go into the answer prompt. If the rerank fails, the fused order is used.`,
          'A degraded run still answers, so it is easy to miss. On 2026-09-24 every answer turned out to report retrieval_mode = tfidf and hybrid = false: the .env endpoint was a Foundry project URL, whose /openai/v1 route serves chat but returns 404 for embeddings. normalize_openai_base_url() now strips the project path, and the hybrid flag is the thing to watch.',
        ],
        example: 'question → BM25 list + embedding list → RRF by rank → LLM rerank → top 3 → grounded answer',
        check: {
          prompt: 'Why fuse the BM25 and embedding results by rank instead of adding their scores?',
          choices: [
            'Ranks are faster to compute than scores',
            'The two scores are on different scales, and positions are already comparable',
            'Embedding scores are always higher, so adding them would ignore BM25',
          ],
          correctIndex: 1,
          explain:
            'RRF only needs each chunk’s position in each list, so there is no score normalisation step to get wrong.',
        },
      },
    ],
    predict: {
      prompt: 'What does the Methodology Q&A bot retrieve from?',
      choices: ['Past retention emails', `Only ${GENAI.ragCorpus}`, 'All files under Docs/'],
      correctIndex: 1,
      reveal: 'One document, the Official report. The email drafter does not use RAG at all.',
    },
    cloze: {
      sentence: 'Meridian ranks chunks with plain Python instead of a vector database because AppLocker blocks ___.',
      choices: ['the native binaries those libraries ship', 'outbound HTTPS to Azure', 'writing cache files to disk'],
      correctIndex: 0,
      explain: 'Chroma and FAISS fail on the unapproved native binary, not on anything about the retrieval maths (ADR 010).',
    },
    elevator: `Retrieval-augmented generation is three steps: split the document into chunks, embed each chunk, then at question time embed the question and return the few closest chunks for the model to answer from. Chroma and FAISS were not an option because AppLocker blocks their native binaries, so the ranking happens in plain Python over one report’s worth of chunks, which is fast enough at that size. Since ADR 015 it is hybrid: BM25 keyword scores and embedding similarity are ranked separately, fused by rank with Reciprocal Rank Fusion, and the chat model reranks the shortlist. If embeddings are not available offline, BM25 carries on alone so the demo still answers. The lesson I would volunteer is the chunking bug: the first version split on chapter headings only, so the top three chunks were about ${Math.round(RAG_CHUNKING.beforeCoverage * 100)}% of the report and the answers were vague. Splitting on every heading level and packing to ${RAG_CHUNKING.afterMaxChars} characters fixed it without touching the embeddings — chunk semantics, not the model, set the ceiling on retrieval precision. Only the methodology Q&A retrieves — the email drafter uses no RAG at all.`,
    takeaways: [
      'Chroma/FAISS were not used because AppLocker blocks their native binaries (ADR 010).',
      `Small chunks + top_k=${RAG_CHUNKING.topK} keep answers grounded and cheap.`,
      `Chunk semantics decide retrieval precision: ${RAG_CHUNKING.beforeChunks} coarse chunks exposed ~${Math.round(RAG_CHUNKING.beforeCoverage * 100)}% of the report in ${RAG_CHUNKING.topK} hits; H1–H6 splitting at ≤${RAG_CHUNKING.afterMaxChars} chars cut that to ~${(RAG_CHUNKING.afterCoverage * 100).toFixed(1)}%.`,
      'The on-disk cache has a schema_version so old chunk shapes are never reused.',
      'Hybrid (BM25 + embeddings, RRF, LLM rerank) since ADR 015; check hybrid = true on answers, because a degraded run still answers.',
      `Still open: ${RAG_015.stillOpen}.`,
    ],
    codeRefs: [
      { path: 'src/genai/rag_engine.py', why: 'Chunking, BM25 + embeddings fused with RRF, LLM rerank, BM25-only fallback' },
      { path: 'Docs/Architecture/ADRs/015-hybrid-rag-rerank-fairness-consolidation.md', why: 'Why hybrid + LLM rerank, and what it does not claim' },
      { path: 'Docs/Architecture/Phase6_Production_RAG_Roadmap.md', why: 'What production RAG would add' },
    ],
  },
  {
    moduleId: 'ethics',
    estMinutes: 7,
    objectives: [
      'Explain equalized odds and selection rate in plain language.',
      'Quote the age and state EOD and the age-band selection pattern.',
      'Explain why fairness is disclosed rather than used as a release gate.',
    ],
    primers: [
      {
        title: 'Two fairness lenses',
        body: [
          'Selection rate: what share of each group gets flagged. Equalized odds: do groups get the same true-positive rate and false-positive rate? The EOD number is the biggest gap on either.',
          `Here: age EOD ${MODEL.eodAge}, state EOD ${MODEL.eodState}; age selection-rate gap ${FAIRNESS.selectionRateDiffAge}.`,
        ],
        check: {
          prompt: 'What does the EOD number report?',
          choices: [
            'The average gap across all groups',
            'The biggest gap on either true-positive or false-positive rate',
            'The share of each group that gets flagged',
          ],
          correctIndex: 1,
          explain:
            'Equalized odds compares TPR and FPR across groups, and EOD is the largest of those gaps. The share flagged is the selection rate, a separate lens.',
        },
      },
      {
        title: 'Base rates complicate it',
        body: [
          'If one group really churns more, a good model will flag it more, so different selection rates alone do not prove bias. That is why the 65+ skew needs investigation rather than an automatic fix.',
        ],
      },
    ],
    predict: {
      prompt: 'Which age band do you expect is flagged most often at the ops cut?',
      choices: ['The youngest band', 'A middle-aged band', '65+'],
      correctIndex: 2,
      reveal: '65+ at ~14.6%, then 56–65 at ~8.3%, other bands ~4.6–4.9%. Whether that is real churn or bias is still open.',
    },
    cloze: {
      sentence:
        'A higher selection rate for one group is not proof of bias on its own, because a group that genuinely churns more should be ___ by a good model.',
      choices: ['flagged more often', 'held out of scoring', 'given a lower threshold'],
      correctIndex: 0,
      explain: 'Base rates differ between groups, so the gap is a question to investigate rather than a defect to patch away.',
    },
    elevator: `Fairness is measured two ways here: selection rate, which is the share of each group that gets flagged, and equalized odds, which asks whether the true-positive and false-positive rates match across groups. Age is the gap worth talking about — the 65+ band is flagged several times more often than the middle bands, and the age EOD of ${MODEL.eodAge} is above the notebook’s own ${FAIRNESS.notebookFlag} flag level. A different selection rate is not proof of bias by itself, because a group that genuinely churns more should be flagged more, so this is disclosed as an open question. There is no remediator and fairness is not a release gate.`,
    takeaways: [
      'Measure and disclose (ADR 012); no remediator, no hard gate yet.',
      `Age EOD ${MODEL.eodAge} exceeds the notebook’s own ${FAIRNESS.notebookFlag} flag — say so.`,
      'Behaviour features drive the model, but age and state are inputs.',
    ],
    codeRefs: [
      { path: 'Docs/Model_Card.md', why: 'Disclosed metrics and limits' },
      { path: 'Docs/Architecture/ADRs/012-fairness-and-compliance-guardrails.md', why: 'Disclose-not-gate decision' },
      { path: 'Docs/Sprint2/reports/fairlearn_equalized_odds.json', why: 'Raw fairness numbers' },
    ],
  },
  {
    moduleId: 'deploy',
    estMinutes: 7,
    objectives: [
      'Say exactly what is packaged, what is hosted, and what is not built.',
      'Explain why SQLite forces a single replica.',
      'Describe what a first CI pipeline would run.',
    ],
    primers: [
      {
        title: 'Containers and replicas',
        body: [
          'A container image bundles the app and its dependencies. A replica is one running copy. Scaling out means more replicas behind a load balancer.',
          'SQLite is a file. Two replicas on two disks would each write their own file and diverge (split-brain), so maxReplicas is 1 until the store moves to Postgres.',
        ],
        check: {
          prompt: 'Why does a SQLite draft store cap the service at one replica?',
          choices: [
            'SQLite cannot serve concurrent reads',
            'Each replica would write its own file and the copies would diverge',
            'The container image is too large to run twice',
          ],
          correctIndex: 1,
          explain:
            'SQLite is a file, so scaling out means two disks and two divergent states — the split-brain ADR 008 rules out until the store moves to Postgres.',
        },
      },
      {
        title: 'What running the smoke test caught',
        body: [
          `The container was first built and run on ${DEPLOY.smokeDate}, following the checklist step by step. Reading the Dockerfile had not found these problems; running it did.`,
          ...DEPLOY.smokeFindings.map((f) => `${f.id}: ${f.what}. Fix: ${f.fix}.`),
          `The image is now ${DEPLOY.imageSize}, installs ${DEPLOY.serviceDeps.split(' — ')[0]} only, and has a HEALTHCHECK on /health. The SQLite drafts survive a restart because they live on a named volume.`,
        ],
        check: {
          prompt: 'Why does the image install a pinned requirements.serving.txt instead of requirements.txt?',
          choices: [
            'requirements.txt is too large to copy into an image',
            'Unpinned installs could pull a scikit-learn that cannot safely load the pickled preprocessor in Models/ops/',
            'Docker cannot read comments in requirements.txt',
          ],
          correctIndex: 1,
          explain:
            'A pickled scikit-learn object should be loaded by the version that saved it. Pinning from requirements.lock keeps serving on 1.9.0 (DK-07); dropping notebook and training packages also shrinks the image.',
        },
      },
    ],
    predict: {
      prompt: 'Which statement matches the recorded deployment evidence?',
      choices: ['The app has a standing production URL on Azure Container Apps', 'The API was deployed to ACA, verified on 2026-09-24, then torn down', 'A CI pipeline runs the Python tests on every push'],
      correctIndex: 1,
      reveal: `${DEPLOY.status}. The subsequent API-key gate still needs live verification. Azure calls need valid credentials; earlier successful calls do not guarantee current availability. The only CI is for this teaching app; the Python tests are run by hand.`,
    },
    cloze: {
      sentence: 'maxReplicas stays at 1 because the draft store is ___, and two copies would each write their own and diverge.',
      choices: ['a single SQLite file', 'an in-memory cache', 'a shared Postgres database'],
      correctIndex: 0,
      explain: 'The cap is a consequence of the storage choice, and it lifts when the store moves to Postgres.',
    },
    elevator:
      `${DEPLOY.status}. Docker and compose package FastAPI only; Streamlit runs separately. The cloud demo used one replica because SQLite files on separate replicas would diverge. The later API-key gate still needs a live check. This proves a demo deployment, not production operations. Azure calls need valid credentials, and CI covers only this teaching app; the Python tests are run by hand.`,
    takeaways: [
      'Dockerfile / compose package the FastAPI service only.',
      `Built and smoke-tested locally on ${DEPLOY.smokeDate}; running it found three high-severity bugs that reading the files had not.`,
      DEPLOY.status,
      'CI covers the teaching app only; the Python tests and the image are checked by hand.',
    ],
    codeRefs: [
      { path: 'Dockerfile', why: 'API image, pinned serving deps, HEALTHCHECK' },
      { path: 'requirements.serving.txt', why: 'Serving-only pins compiled from requirements.lock for Linux' },
      { path: 'docker-compose.yml', why: 'One fastapi service, SQLite volume, API_PORT override' },
      { path: 'azure.yaml', why: 'azd project; local Docker build after ACR Tasks failure' },
      { path: 'Docs/Architecture/ADRs/016-azure-container-apps-via-azd.md', why: 'Verified demo deployment, teardown and pending cloud key check' },
      { path: 'Docs/Sprint5/docker_smoke_checklist.md', why: 'Smoke steps, findings DK-01…DK-13, pass log' },
    ],
  },
];

export function getLesson(id: ModuleId): Lesson | undefined {
  return LESSONS.find((l) => l.moduleId === id);
}
