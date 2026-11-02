/**
 * Question bank for module checks and spaced review. Mix of multiple choice,
 * "spot the false claim", "defend the decision" and numeric recall.
 * Numbers come from facts.ts.
 */
import type { ModuleId } from './modules';
import {
  ADR_COUNT,
  AUM_AT_RISK,
  AZURE_RESILIENCE,
  GENAI,
  MODEL,
  OPS_MATH,
  RAG_015,
  RAG_CHUNKING,
  REASONING_PARAMS,
  formatOpsThreshold,
} from './facts';
import { QUIZ } from './quiz';

interface Base {
  id: string;
  moduleId: ModuleId;
  prompt: string;
  explain: string;
}
export interface ChoiceQuestion extends Base {
  /**
   * `justify` items are the viva-shaped ones: every option is a defensible-sounding
   * sentence, so they cannot be cleared by eliminating a joke distractor.
   */
  kind: 'mcq' | 'false-claim' | 'justify';
  choices: string[];
  correctIndex: number;
  /**
   * Index-parallel to `choices`: why that specific wrong option is tempting and
   * where it breaks. The entry at `correctIndex` is '' and is never rendered.
   */
  whyWrong: string[];
}
export interface NumericQuestion extends Base {
  kind: 'numeric';
  answer: number;
  tolerance: number;
  unit?: string;
}
export type Question = ChoiceQuestion | NumericQuestion;

export const QUESTIONS: Question[] = [
  // 01 Problem
  { id: 'p1', moduleId: 'problem', kind: 'numeric', prompt: 'AUM-at-risk baseline, in $ millions?', answer: AUM_AT_RISK.exact / 1e6, tolerance: 0.1, unit: '$M', explain: `${AUM_AT_RISK.displayExact}: prior-3-month max balance at first exit, summed over churners.` },
  {
    id: 'p2', moduleId: 'problem', kind: 'mcq',
    prompt: 'Morgan (Andy) mainly worries about…',
    choices: ['Leakage in the feature pipeline', 'Whether agents can work a ranked queue without drowning in false positives', 'PII reaching Azure'],
    correctIndex: 1,
    whyWrong: [
      'Leakage is Sam’s question — he holds the veto on temporal rigour and MLflow lineage. Morgan is only Informed on the model stream.',
      '',
      'PII reaching Azure is Jamie’s ground: ZDR scrubbing and compliance sign-off. Morgan is asking what the queue costs to staff.',
    ],
    explain: 'Morgan = product / ops budget: queue capacity and ROI.',
  },
  {
    id: 'p3', moduleId: 'problem', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['The model ranks; a capacity rule picks who to contact', 'GenAI emails customers once a draft is approved', 'Silent churn means draining an account without closing it'],
    correctIndex: 1,
    whyWrong: [
      'This one is true: the model only produces an ordering, and a separate capacity rule decides who an agent actually sees. Ranking and selection are deliberately two steps.',
      '',
      'This is true, and it is the whole premise — customers rarely close the account, they drain it, which is why the label is next-month zero balance and no activity.',
    ],
    explain: 'Approve ≠ Sent. No part of the system sends email.',
  },
  {
    id: 'p4', moduleId: 'problem', kind: 'justify',
    prompt: 'An assessor says: "~$7.3M is a historical number from data you already have. It is not money you saved, so why quote it at all?" Best response?',
    choices: [
      'It is the projected annual saving once the model is deployed at full capacity, discounted for the top-5% cut.',
      'It is a sizing number, not a benefit claim: it says how much balance historically walked out this way, which is what justifies building anything here. The benefit claim would need a controlled comparison of contacted versus not-contacted customers, which we have not run.',
      'It is the value of assets under management that the retention team is contractually required to protect each year.',
      'It is the upper bound of what the model can save, because the top-5% cut captures the highest-balance churners first.',
    ],
    correctIndex: 1,
    whyWrong: [
      'A projected saving would need a forecast and a contacted-versus-not comparison behind it. This figure is neither — it is a backward-looking sum over customers who have already left.',
      '',
      'There is no protection mandate anywhere in the project. The number came out of the Sprint 1 / PRD sizing exercise, not a contract with the retention team.',
      'An upper bound would assume every flagged customer is both caught and kept. The ranking is by churn risk rather than by balance, so the top 5% is not the high-balance slice.',
    ],
    explain: 'Sizing ≠ savings. Claiming saved AUM without a holdout comparison is the easiest claim for an assessor to knock down.',
  },
  {
    id: 'p5', moduleId: 'problem', kind: 'mcq',
    prompt: "Under Meridian's RASCI matrix, who is solely Accountable (A) for model risk, leakage prevention, and ML evaluation?",
    choices: ['Morgan (Product Lead)', 'Sam (Head of Data Science)', 'Jamie (Risk & Compliance)', 'Solo AI Engineer'],
    correctIndex: 1,
    whyWrong: [
      'Morgan is Accountable, but for the product and capacity stream — retention ROI and queue sizing. On the ML stream Morgan is only Informed.',
      '',
      'Jamie is Accountable for governance: ZDR, the rate cap, HITL enforcement and fairness disclosure. On the ML stream Jamie is Consulted, which is advice, not veto.',
      'The engineer builds the pipeline, which is Responsible (R). RASCI separates doing the work from carrying the veto, and the veto here sits with Sam.',
    ],
    explain: 'Sam is the sole Accountable (A) authority for technical model risk, leakage checks, and MLflow lineage; the AI Engineer is Responsible (R).',
  },
  {
    id: 'p6', moduleId: 'problem', kind: 'mcq',
    prompt: "In Meridian's CATWOE analysis, what is the core Transformation (T)?",
    choices: [
      'Automatically drafting and dispatching outbound emails to all dormant accounts',
      'Transforming raw multi-year transaction/balance logs into ranked churn scores + capacity-cut GenAI drafts for human approval',
      'Migrating the legacy relational database to a serverless cloud vector store',
    ],
    correctIndex: 1,
    whyWrong: [
      'Two things break here: nothing is dispatched (Approve ≠ Sent), and dormancy is not the trigger — a high-balance dormant account is explicitly not churn.',
      '',
      'That would be an infrastructure change rather than a Transformation in CATWOE terms — and the native vector store is the thing AppLocker blocked (ADR 010).',
    ],
    explain: 'Transformation converts raw behavioral records into actionable risk rankings and supervised drafts; outreach remains strictly human-led.',
  },
  {
    id: 'p7', moduleId: 'problem', kind: 'justify',
    prompt: 'Under the POPIT framework, why did Meridian implement an attention acknowledgment checkbox and fast-decision warnings (<8s) in the Friction-Gate UI?',
    choices: [
      'To throttle API throughput and conserve Azure OpenAI token TPM quotas.',
      'To address the "People" and "Process" dimensions: mitigating automation bias and review fatigue where agents blindly rubber-stamp AI drafts.',
      'Because SQLite WAL requires an 8-second cool-down period between concurrent file locks.',
      'To comply with bank requirements for manual credit score verification.',
    ],
    correctIndex: 1,
    whyWrong: [
      'Token quotas are a real constraint and ADR 013 handles them with retries and backoff. But the checkbox and the timer sit in the review UI, after the draft already exists — they cost Azure nothing.',
      '',
      'SQLite WAL is the draft and audit store and it has no such cool-down. The eight seconds measures how long a human looked at a draft, not how long a file lock waits.',
      'No credit decision is made anywhere in this system — the output is a retention email. That is exactly why the controls are about attention rather than underwriting.',
    ],
    explain: 'POPIT recognizes that technology alone fails without addressing human behavior: rubber-stamping AI drafts violates the core Human-In-The-Loop premise (JR-REQ-19).',
  },
  // 02 Repo
  {
    id: 'a1', moduleId: 'architecture', kind: 'mcq',
    prompt: 'Why can serving run on a fresh clone without the MLflow database?',
    choices: ['Serving retrains on startup', 'Models/ops/ (booster, preprocessor, serving_meta) is committed (ADR 005)', 'The model is downloaded from the MLflow Model Registry'],
    correctIndex: 1,
    whyWrong: [
      'Retraining at boot would make every start non-deterministic and would lose the run_id the audit row records. The booster is loaded at serving time, never fitted.',
      '',
      'Nothing is registered in the Model Registry — MLflow is used here as a local tracking store (ADR 009), so there is nothing to pull down.',
    ],
    explain: 'Nothing is registered in the Model Registry; the portable export is committed.',
  },
  {
    id: 'a2', moduleId: 'architecture', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['ADR 006 has a 2026-09-18 follow-on', 'StartingFiles/*.csv are committed to git', 'Corrections_and_Future_Work.md registers doc-vs-code fixes'],
    correctIndex: 1,
    whyWrong: [
      'True — ADR 006 carries a follow-on dated 2026-09-18, the one that made the UI call FastAPI over HTTP by default.',
      '',
      'True — that register is where doc-vs-code mismatches are written down rather than quietly patched, which is why corrected claims stay traceable.',
    ],
    explain: 'Raw CSVs are gitignored and obtained separately.',
  },
  { id: 'a3', moduleId: 'architecture', kind: 'numeric', prompt: 'How many ADRs are in Docs/Architecture/ADRs/?', answer: ADR_COUNT, tolerance: 0, explain: `ADR 001–${String(ADR_COUNT).padStart(3, '0')}. ADR 015 (hybrid RAG + rerank, fairness consolidation) landed 2026-09-22.` },
  // 03 Working
  {
    id: 'w1', moduleId: 'workflows', kind: 'mcq',
    prompt: 'Why does the AppLocker machine use py -3.13 -m pytest instead of pytest?',
    choices: ['It is faster', 'pytest.exe in .venv\\Scripts is an unapproved executable and gets blocked', 'pytest does not support Python 3.13'],
    correctIndex: 1,
    whyWrong: [
      'Module invocation is not faster — it is the same interpreter running the same code. The question is which executable is allowed to start at all.',
      '',
      'pytest runs fine on 3.13. You are invoking the same pytest either way; only the entry point changes, from a .venv wrapper to the approved interpreter.',
    ],
    explain: 'ADR 001: run tools as modules of the approved global interpreter.',
  },
  {
    id: 'w2', moduleId: 'workflows', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['Split-brain is when two replicas diverge on separate state', 'Split-Executor is a database replication mode', 'maxReplicas: 1 prevents SQLite split-brain'],
    correctIndex: 1,
    whyWrong: [
      'True — that is precisely the ADR 008 concern: two replicas each holding their own SQLite file and drifting apart.',
      '',
      'True — pinning to a single replica is the mitigation, because there is then only ever one writer of the draft and audit database.',
    ],
    explain: 'Split-Executor is the human-runs-the-commands workflow.',
  },
  {
    id: 'w3', moduleId: 'workflows', kind: 'mcq',
    prompt: 'Why does the Streamlit app avoid Streamlit’s own pages/ directory (ADR 011)?',
    choices: [
      'Session state cannot be shared between files in a pages/ layout',
      'Clicking a page forks a secondary Python subprocess, which AppLocker blocks — the UI crashes or freezes',
      'pages/ does not support the X-Demo-Role sidebar selector',
    ],
    correctIndex: 1,
    whyWrong: [
      'Session state does carry across a pages/ layout, so this is not the blocker. What matters is what clicking a page does at the process level.',
      '',
      'A sidebar selector works perfectly well under pages/. The constraint is the operating-system policy, not Streamlit’s widget model.',
    ],
    explain: 'ADR 011: single-file if/elif routing off the role selector. The cost is a large file needing strict function encapsulation.',
  },
  // 04 Data
  {
    id: 'd1', moduleId: 'data', kind: 'mcq',
    prompt: 'The churn label for observation month t is computed from…',
    choices: ['Month t balance and activity', 'Month t+1: rounded balance 0 AND no active transactions', 'Whether the account was closed'],
    correctIndex: 1,
    whyWrong: [
      'Month t is the observation window — those values are the features. A label drawn from the same month leaves nothing to predict.',
      '',
      'Closure is exactly what the label avoids waiting for: silent churn drains the balance to zero without any closure event, so a close-based label misses the case the project exists for.',
    ],
    explain: 'ADR 004: left-looking, next-month label.',
  },
  {
    id: 'd2', moduleId: 'data', kind: 'mcq',
    prompt: 'How many cross-validation folds were used?',
    choices: ['5 temporal folds', 'None — one chronological fit / validation / test split', '10 shuffled folds'],
    correctIndex: 1,
    whyWrong: [
      'Temporal folds sound right for a time-series problem, which is why this one sits on the anti-claim list as a corrected claim. There is a single chronological fit / validation / test split.',
      '',
      'Shuffling would scatter later months into the training set, which is the exact leakage a chronological split exists to prevent.',
    ],
    explain: 'One time-based split. “Temporal CV folds” was a corrected claim.',
  },
  { id: 'd3', moduleId: 'data', kind: 'numeric', prompt: 'gone_this_month equals the label on about what % of rows?', answer: 81.75, tolerance: 3, unit: '%', explain: '~82%: the label is a next-month shift, not “already gone”.' },
  {
    id: 'd4', moduleId: 'data', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['Rolling features are shifted before rolling', 'The validation window is used to pick the threshold', 'The threshold was tuned on the test months'],
    correctIndex: 2,
    whyWrong: [
      'True, and it is what makes the rolling windows safe: shifting first keeps month t’s own value out of its own aggregate.',
      'True — the ops cut is the top-5% quantile of validation scores. Picking it there is what leaves the test window as a single clean read.',
      '',
    ],
    explain: 'Test is touched once, after everything is frozen.',
  },
  {
    id: 'd5', moduleId: 'data', kind: 'justify',
    prompt: 'Sam challenges you: "gone_this_month is both a feature and nearly the label. That is leakage." How do you answer?',
    choices: [
      'It is leakage in principle, but the top-5% ops cut removes the practical effect, so the shipped numbers are still safe.',
      'We dropped gone_this_month from the feature matrix once we noticed the overlap, which is why the heuristic baseline is a separate artefact.',
      'It agrees with the label only about 82% of the time, and it is a month-t observation, so it cannot carry any t+1 information. It is a strong legitimate signal — which is exactly why "gone this month" alone is the baseline the model has to beat.',
      'A chronological split makes leakage impossible by construction, so no individual feature needs auditing.',
    ],
    correctIndex: 2,
    whyWrong: [
      'The cut does move the operating point, but it cannot undo leakage. If a feature carried future information, the ranking itself would be contaminated at every cut, including this one.',
      'It was not dropped. It is a legitimate month-t observation and it is also the heuristic the model is scored against — removing it would remove the comparison the definition of done rests on.',
      '',
      'A chronological split stops later rows from training the model, which is a different failure. Leakage inside a single row — a feature computed from t+1 — survives any split, so features still have to be audited one at a time.',
    ],
    explain: 'Leakage is about when a value becomes knowable, not about correlation with the label. A chronological split alone does not prevent within-row leakage — each feature still has to be checked.',
  },
  // 05 Model
  { id: 'm1', moduleId: 'ml', kind: 'numeric', prompt: 'Test PR-AUC of the shipped model?', answer: MODEL.prAuc.model, tolerance: 0.005, explain: `${MODEL.prAuc.model} vs heuristic ${MODEL.prAuc.heuristic}.` },
  { id: 'm2', moduleId: 'ml', kind: 'numeric', prompt: 'Ops threshold t (3 decimals)?', answer: MODEL.opsThreshold, tolerance: 0.002, explain: `${formatOpsThreshold('precise')} — validation top-5% quantile.` },
  {
    id: 'm3', moduleId: 'ml', kind: 'mcq',
    prompt: 'Why was the 40% precision floor dropped?',
    choices: ['Sam changed his mind', 'Even the top 1% of scores was only ~24% precise — the floor was unreachable', 'Azure OpenAI could not handle more drafts'],
    correctIndex: 1,
    whyWrong: [
      'The floor was dropped on evidence rather than preference, and the evidence is written down in ML_Learnings §2.4a. Nobody had to be talked round.',
      '',
      'Draft volume is a real capacity question and it is why there is a top-5% cut at all. The precision floor died for a separate reason: no slice of the ranking ever reached it.',
    ],
    explain: 'Documented in ML_Learnings §2.4a, then fell back to capacity.',
  },
  {
    id: 'm4', moduleId: 'ml', kind: 'mcq',
    prompt: 'Lowering the threshold from the ops cut to max-F1 changes PR-AUC how?',
    choices: ['Raises it', 'Lowers it', 'Not at all — PR-AUC is threshold-free'],
    correctIndex: 2,
    whyWrong: [
      'Moving a threshold changes precision and recall at the operating point — it does not change the curve those points sit on.',
      'Nothing about the model changed: same booster, same scores, same ordering. Only the place the line is drawn moved.',
      '',
    ],
    explain: 'Both MLflow runs have identical PR-AUC; only the cut moved.',
  },
  {
    id: 'm5', moduleId: 'ml', kind: 'mcq',
    prompt: 'Which feature dominates global SHAP?',
    choices: ['age_years', 'Running_Balance_Rounded', 'state_CALIFORNIA'],
    correctIndex: 1,
    whyWrong: [
      'Age is the attribute carrying the largest fairness gap, which makes it the memorable one. Memorable is not the same as high attribution — its global mean |SHAP| sits well below the balance feature.',
      '',
      'State is spread across many one-hot columns, so no single state column can accumulate much global attribution even if geography mattered.',
    ],
    explain: 'Running_Balance_Rounded dominates with Mean |SHAP| ≈ 3.004, followed by unrounded Running_Balance ≈ 0.64.',
  },
  {
    id: 'm6', moduleId: 'ml', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['A score of 0.75 means a 75% chance of churn', 'scale_pos_weight helps ranking under imbalance', 'Always-negative has higher accuracy than the model'],
    correctIndex: 0,
    whyWrong: [
      '',
      'True — reweighting the positive class stops the booster collapsing onto the majority, which improves the ordering. It does that while leaving the output scale uncalibrated, which is why the other statement fails.',
      'True, and it is the reason accuracy is treated as an anti-pattern here: churn is rare in any given month, so predicting that nobody churns scores well and is useless.',
    ],
    explain: 'Scores are ranks, not calibrated probabilities.',
  },
  // 05 Model — queue arithmetic (Morgan's actual question)
  { id: 'm7', moduleId: 'ml', kind: 'numeric', prompt: `Moving from max-F1 (t=${MODEL.maxF1Threshold}) to the ops cut divides test-window false positives by roughly what factor?`, answer: OPS_MATH.fpReductionFactor, tolerance: 1.5, unit: '×', explain: `${MODEL.maxF1FalsePositives.toLocaleString()} → ${MODEL.opsFalsePositives.toLocaleString()} FPs ≈ ${OPS_MATH.fpReductionFactor}×. Same model, same PR-AUC — only the cut moved.` },
  { id: 'm8', moduleId: 'ml', kind: 'numeric', prompt: 'Of 100 customers the ops cut puts in front of an agent, about how many actually churn next month?', answer: OPS_MATH.contactedPrecisionPct, tolerance: 3, unit: 'of 100', explain: `Precision at the ops cut ≈ ${MODEL.opsPrecision}. Roughly 3 in 4 flagged customers are false positives — which is why a human approves every draft and nothing auto-sends.` },
  { id: 'm9', moduleId: 'ml', kind: 'numeric', prompt: 'What share of next-month churners does the top-5% cut actually catch, in %?', answer: OPS_MATH.contactedRecallPct, tolerance: 2, unit: '%', explain: `Recall ≈ ${MODEL.opsRecall}. ${OPS_MATH.note}` },
  {
    id: 'm10', moduleId: 'ml', kind: 'justify',
    prompt: 'Morgan: "Top 10% would catch twice as many churners for twice the drafts. Why stop at 5%?" Best defence?',
    choices: [
      'Top 10% would dilute the ranking and lower PR-AUC, so the model would measurably get worse.',
      'Precision is essentially flat across those slices on validation (~23% at both 5% and 10%), so there is no metric optimum to find — the cut is set by how many drafts the team can genuinely review. If you fund the capacity, 10% is a defensible move, and the number is yours to change rather than mine.',
      'The 40% precision floor is met at the top 5% but breaks down at the top 10%, so 5% is the last compliant slice.',
      'Azure OpenAI quota limits draft generation to about 5% of the book per month.',
    ],
    correctIndex: 1,
    whyWrong: [
      'PR-AUC scores the whole ordering and does not move when you change where the cut falls. Contacting more people changes who you contact, not how well the model ranks.',
      '',
      'The floor was never met at any slice — even the top 1% of validation scores is only about 24% precise. That is why it was dropped rather than used to justify a slice.',
      'Azure quota is a genuine constraint and ADR 013 handles it with retries and backoff. The 5% came from how many drafts the retention team can actually review, not from a token limit.',
    ],
    explain: 'The honest answer names the cut as an ops decision, not a modelling one — and hands it back to the budget owner. PR-AUC is threshold-free; the precision floor was unreachable everywhere.',
  },
  {
    id: 'm11', moduleId: 'ml', kind: 'justify',
    prompt: 'Sam: "Your scores are not calibrated. How can you defend a cut at 0.701?" Best defence?',
    choices: [
      'scale_pos_weight corrects the imbalance, so 0.701 does correspond to a genuine ~70% churn probability.',
      '0.701 is not a probability — it is wherever the validation top-5% boundary happened to land. A rank cut needs only the ordering to be right, and ordering is what PR-AUC measures. Calibration would start to matter if we quoted the number as a risk to a customer, or traded expected loss against contact cost; we do neither.',
      'We Platt-scaled the scores on the validation window before selecting the cut, so the threshold is calibrated.',
      'Calibration is a regression concern; for binary classification the raw margin is sufficient by construction.',
    ],
    correctIndex: 1,
    whyWrong: [
      'scale_pos_weight does help the model rank under imbalance, which is why this sounds plausible. But reweighting the loss distorts the output scale rather than repairing it — it makes the scores less probability-like, not more.',
      '',
      'No calibration step was fitted anywhere in the pipeline. Claiming a method you did not run is on the anti-claim list, and it is the single easiest thing for Sam to check.',
      'Calibration is very much a classification concern: it is the question of whether a 0.7 score means 0.7 of those customers churn. The defence is that we never use the number that way, not that the question does not apply.',
    ],
    explain: 'Say what the number is (a quantile boundary) and what would have to change for calibration to matter. Claiming calibration you did not do is anti-claim #3.',
  },
  // 06 Serving
  {
    id: 's1', moduleId: 'serving', kind: 'mcq',
    prompt: 'What is the default FRICTION_GATE_MODE?',
    choices: ['inprocess', 'http', 'direct'],
    correctIndex: 1,
    whyWrong: [
      'inprocess is real, but it is the fallback for the AppLocker machine where a localhost socket is awkward — not what you get by default.',
      '',
      'There is no direct mode. Every route to a draft goes through the FastAPI app; the only choice is whether the call crosses a socket.',
    ],
    explain: 'HTTP to uvicorn; inprocess is the AppLocker fallback.',
  },
  {
    id: 's2', moduleId: 'serving', kind: 'mcq',
    prompt: 'In inprocess mode, the UI…',
    choices: ['imports draft_store and writes SQLite itself', 'calls the same FastAPI app through an ASGI test client', 'skips the threshold gate'],
    correctIndex: 1,
    whyWrong: [
      'This is exactly what inprocess mode is built to avoid, and a test fails if the UI imports draft_store or create_draft — a second writer would sit behind the enforcement point.',
      '',
      'The gate lives inside the API, and inprocess mode still calls that API. Nothing about the rules changes; only the transport does.',
    ],
    explain: 'Same rules, no socket. A test fails if the UI imports draft_store / create_draft.',
  },
  {
    id: 's3', moduleId: 'serving', kind: 'mcq',
    prompt: 'Why does POST /drafts use extra="forbid"?',
    choices: ['To speed up parsing', 'So a client cannot submit its own score or unknown fields', 'Because Pydantic requires it'],
    correctIndex: 1,
    whyWrong: [
      'Rejecting unknown fields costs a comparison, not time worth optimising. The reason is what a permitted extra field would let a caller do.',
      '',
      'Pydantic’s default is to ignore unknown fields, so forbidding them is a deliberate choice rather than a library requirement.',
    ],
    explain: 'The API re-scores from raw features.',
  },
  {
    id: 's4', moduleId: 'serving', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['Only the API writes drafts', 'Roles are verified with Entra ID', 'The API returns 422 for unflagged accounts'],
    correctIndex: 1,
    whyWrong: [
      'True — that is the single enforcement point, and a test fails if the UI writes the draft store directly.',
      '',
      'True — an account scoring below the ops cut is refused a draft, which is what makes the threshold a control rather than a display.',
    ],
    explain: 'Demo X-Demo-Role header only; Entra ID is future work.',
  },
  {
    id: 's5', moduleId: 'serving', kind: 'justify',
    prompt: 'Why does the API re-score from raw features instead of trusting the score the UI already computed?',
    choices: [
      'Scores computed in the Streamlit process go stale because session state is not refreshed between reruns.',
      'If a client could supply the score, the threshold gate would be advisory — anyone who can reach the API could post 0.99 and obtain a draft for any customer. Re-scoring behind extra="forbid" makes FastAPI the one place the rule is enforced, and guarantees the score and run_id on the audit row are the ones actually used.',
      'Streamlit cannot load the XGBoost booster under AppLocker, so scoring has to happen server-side.',
      'Pydantic cannot validate a float that was produced outside the request model.',
    ],
    correctIndex: 1,
    whyWrong: [
      'Streamlit reruns are a genuine source of staleness, and a stale score would be a correctness bug worth fixing. This is a trust question instead: the problem is not that the client’s number might be old, it is that the client supplies it at all.',
      '',
      'Streamlit runs on the same approved interpreter and could load the booster. It does not because scoring is where the rule is enforced, and enforcement belongs on one side of the boundary.',
      'Pydantic will validate any float you hand it, including a hostile 0.99. That is precisely why validation is not the control here.',
    ],
    explain: 'The point is enforcement, not correctness: a control whose input the caller supplies is not a control. That is what "single enforcement point" means in F8 / ADR 015.',
  },
  // 07 Friction
  { id: 'f1', moduleId: 'friction', kind: 'numeric', prompt: 'Fast-decide soft-warning window, in seconds?', answer: GENAI.fastDecideSeconds, tolerance: 0, unit: 's', explain: 'FAST_DECIDE_SECONDS = 8, logged as fast_decide_warn.' },
  {
    id: 'f2', moduleId: 'friction', kind: 'mcq',
    prompt: 'An agent approves after 3 seconds. What happens?',
    choices: ['Blocked until 8 s pass', 'Approved; audit detail records fast_decide_warn: true', 'Escalated to Compliance for co-approval'],
    correctIndex: 1,
    whyWrong: [
      'A block is what most people expect, and it is deliberately not what happens: blocking pushes the behaviour out of sight, where Risk can no longer count it.',
      '',
      'Compliance can view drafts but approves nothing (ADR 007), so there is no co-approval path to escalate into.',
    ],
    explain: 'Soft warn, not a block — surfaces rubber-stamping instead of hiding it.',
  },
  {
    id: 'f3', moduleId: 'friction', kind: 'mcq',
    prompt: 'Which role can approve drafts?',
    choices: ['compliance_viewer', 'data_scientist', 'retention_agent'],
    correctIndex: 2,
    whyWrong: [
      'Compliance sees everything and approves nothing. Separating the people who audit from the people who act is the point of the role split (ADR 007).',
      'Approving a draft is a customer-contact decision, so it belongs to the role that performs the outreach rather than the role that inspects the model.',
      '',
    ],
    explain: 'ADR 007: compliance sees all, approves nothing.',
  },
  {
    id: 'f4', moduleId: 'friction', kind: 'justify',
    prompt: 'Jamie: "If a sub-8-second approval is a problem, why not just block it?" Best defence?',
    choices: [
      'A hard timer would block the Streamlit event loop and make the review queue unusable.',
      'Because a hard block does not remove the behaviour, it hides it: reviewers learn to wait out the timer and click anyway, and you get the same rubber-stamp carrying a compliant timestamp. A logged warning keeps it visible to Risk as a measurable rate. Note the attention acknowledgement IS enforced — we block what we can define, and measure what we cannot.',
      'ADR 003 rules out blocking controls on principle; friction must always be advisory.',
      'Eight seconds cannot be measured reliably across browsers, so enforcing it would be unfair.',
    ],
    correctIndex: 1,
    whyWrong: [
      'A countdown can be implemented without freezing the UI, so this argues against one bad implementation rather than against blocking. The real objection is what a block does to the reviewer’s behaviour.',
      '',
      'ADR 003 does not forbid blocking — the attention acknowledgement is a hard block, and the rate cap is enforced too. The distinction is what can be defined precisely enough to enforce.',
      'The elapsed time is measured well enough to log and report on. If it were too noisy to trust, it would also be too noisy to warn on, and the warning is the shipped control.',
    ],
    explain: 'The distinction between an enforced control (attention ack) and an observed signal (fast_decide_warn) is the heart of "friction as a feature".',
  },
  // 08 GenAI
  { id: 'g1', moduleId: 'genai', kind: 'numeric', prompt: 'Maximum offered_interest_rate, in %?', answer: 3.5, tolerance: 0, unit: '%', explain: 'Pydantic rejects a numeric offer above 0.035; invalid Azure output uses the safe stub.' },
  {
    id: 'g2', moduleId: 'genai', kind: 'mcq',
    prompt: 'Azure is configured but the call fails after retries. drafter_source is…',
    choices: ['azure', 'stub', 'stub_fallback'],
    correctIndex: 2,
    whyWrong: [
      'drafter_source records what actually produced the text, not what was configured. If Azure never returned a draft, it did not draft.',
      'stub means Azure was never configured at all — offline or demo. The two are kept apart so a failure stays visible instead of looking like an ordinary offline run.',
      '',
    ],
    explain: 'stub = Azure not configured; stub_fallback = Azure failed.',
  },
  {
    id: 'g3', moduleId: 'genai', kind: 'mcq',
    prompt: 'What does the PII scrubber NOT catch?',
    choices: ['Email addresses', 'A first name inside a free-text note', '10-digit account numbers'],
    correctIndex: 1,
    whyWrong: [
      'Email addresses are caught — they have a fixed shape, and shape is what the scrubber matches on.',
      '',
      'Account numbers are caught for the same reason: a fixed-length digit run is matchable. A name sitting in prose has no shape to match.',
    ],
    explain: 'Names are dropped only as blocked keys; no free-text name detection.',
  },
  {
    id: 'g4', moduleId: 'genai', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['The drafter retrieves past retention emails with RAG', 'Driver names come from serving_meta.json, not the LLM', 'Output subject and body are scrubbed again'],
    correctIndex: 0,
    whyWrong: [
      '',
      'True — the drivers in a draft are the frozen global SHAP names from serving_meta.json, so the model cannot invent an explanation for why a customer was flagged.',
      'True — scrubbing runs on the way out as well as on the way in, because a model can echo back something it was handed.',
    ],
    explain: 'The drafter uses no RAG.',
  },
  { id: 'g5', moduleId: 'genai', kind: 'numeric', prompt: 'Maximum Tenacity retry attempts against Azure (ADR 013)?', answer: AZURE_RESILIENCE.maxAttempts, tolerance: 0, explain: `Exponential backoff, max ${AZURE_RESILIENCE.maxAttempts} attempts, on ${AZURE_RESILIENCE.retryOn.join(' / ')}. Then the stub drafts instead — there is no redraft loop.` },
  {
    id: 'g6', moduleId: 'genai', kind: 'justify',
    prompt: 'Why reject an invalid generated offer rather than clamp only its numeric rate?',
    choices: [
      'Clamping the numeric field also rewrites every promise in the email.',
      'The email can still promise an excessive rate after its numeric field is clamped. Validate both the field and numeric percentage claims, then use the safe stub if validation fails.',
      'Pydantic cannot express an upper bound on a float field.',
      'Every invalid offer must trigger another live Azure call.',
    ],
    correctIndex: 1,
    whyWrong: [
      'Changing one JSON field does not change the subject or body.',
      '',
      'Pydantic enforces an upper bound and a cross-field text check here.',
      'The existing local stub keeps the review workflow available without another provider call.',
    ],
    explain: 'Reject inconsistent output. The numeric offer and explicit percentage claims must pass validation; a human must still review the wording.',
  },
  {
    id: 'g7', moduleId: 'genai', kind: 'justify',
    prompt: `The deployment was switched to ${GENAI.chatModel} and every draft since reads drafter_source = stub_fallback. Nobody noticed because the queue kept filling. What is the right lesson?`,
    choices: [
      'The stub fallback is the bug: it should be removed so an Azure failure stops the queue and forces someone to fix it.',
      `The fallback did its job, and the failure was that no one read the signal it leaves. ${GENAI.chatModel} is a reasoning model that rejects max_tokens with a 400, so the fix is per-model parameters (chat_limit_params) — and the habit is to check drafter_source after any model or endpoint change, not whether drafts still appear.`,
      'Reasoning models are too unreliable for drafting; roll back to the previous model and pin it.',
      'Tenacity should have retried the 400 until Azure accepted the request.',
    ],
    correctIndex: 1,
    whyWrong: [
      'Removing the fallback trades a silent degradation for an outage on the review queue, which ADR 013 deliberately avoids. The fallback is right; the monitoring was missing.',
      '',
      'The model was not unreliable — the request was invalid for it. Rolling back hides a one-line parameter fix behind a model choice.',
      'A 400 is a permanent error: the same request fails the same way every time. Retrying it only adds latency, which is why Tenacity retries 429s, timeouts and 5xx only.',
    ],
    explain: `DK-09 (2026-09-24): ${REASONING_PARAMS.rule} A fallback that always works needs a signal someone actually reads.`,
  },
  // 09 RAG
  { id: 'r1', moduleId: 'rag', kind: 'numeric', prompt: 'How many chunks does retrieve return (top_k)?', answer: GENAI.ragTopK, tolerance: 0, explain: 'top_k = 3.' },
  { id: 'r2', moduleId: 'rag', kind: 'numeric', prompt: 'Maximum chunk size in characters?', answer: GENAI.ragChunkMaxChars, tolerance: 0, explain: 'Paragraphs packed up to 1200 characters.' },
  {
    id: 'r3', moduleId: 'rag', kind: 'mcq',
    prompt: 'With no Azure access, retrieval falls back to…',
    choices: ['Chroma', 'the BM25 ranking alone', 'nothing — the bot is disabled'],
    correctIndex: 1,
    whyWrong: [
      'Chroma is not a fallback, it is the option that was ruled out: the native binary is blocked before any retrieval could run (ADR 010).',
      '',
      'Hard-failing is exactly what ADR 015 avoids. Losing the dense signal degrades the ranking; it does not remove the ability to answer.',
    ],
    explain: 'ADR 015: BM25 and dense are built together and fused with RRF. If only one signal is available, that ranking is used directly — it degrades, it never hard-fails.',
  },
  {
    id: 'r4', moduleId: 'rag', kind: 'mcq',
    prompt: 'Cosine similarity of two vectors pointing the same direction is…',
    choices: ['0', '1', '-1'],
    correctIndex: 1,
    whyWrong: [
      'Zero is the orthogonal case — unrelated directions, which is the middle of the range rather than the top of it.',
      '',
      'Minus one is the opposite direction. The sign says which way, the magnitude says how strongly.',
    ],
    explain: '1 = same direction, ~0 = unrelated, -1 = opposite.',
  },
  {
    id: 'r5', moduleId: 'rag', kind: 'mcq',
    prompt: 'How are the BM25 and dense-embedding rankings combined (ADR 015)?',
    choices: ['Their raw scores are summed after min-max normalisation', 'Reciprocal Rank Fusion over the two independent rankings', 'The dense ranking wins whenever Azure is reachable'],
    correctIndex: 1,
    whyWrong: [
      'This is what fusing by score would require, and it is the reasonable first instinct. Normalising two incomparable scales is the step RRF lets you skip, because positions are already on the same scale.',
      '',
      'Then the sparse ranking would only ever matter offline and the design would be a fallback rather than a fusion. Both rankings contribute whenever both exist.',
    ],
    explain: '_reciprocal_rank_fusion works on positions, so the two incomparable score scales never have to be normalised against each other.',
  },
  { id: 'r6', moduleId: 'rag', kind: 'numeric', prompt: 'What cache schema_version does the hybrid index write?', answer: RAG_015.cacheSchemaVersion, tolerance: 0, explain: `Bumped 3→${RAG_015.cacheSchemaVersion}: ${RAG_015.cacheBumpReason}.` },
  {
    id: 'r7', moduleId: 'rag', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['The Streamlit Q&A page calls POST /rag/ask through FrictionGateClient', 'Reranking uses a BGE cross-encoder downloaded at build time', 'All three demo roles hold use_rag_assistant'],
    correctIndex: 1,
    whyWrong: [
      'True since ADR 015 — the UI no longer imports rag_engine, which is what makes FastAPI the single place anything Azure-touching happens.',
      '',
      'True — the endpoint is read-only methodology Q&A, so there is no reason to withhold it from any of the three roles.',
    ],
    explain: 'ADR 015 reuses the existing Azure chat deployment to rerank. Cohere / BGE / sentence-transformers were rejected: paid API or AppLocker-blocked native download.',
  },
  {
    id: 'r8', moduleId: 'rag', kind: 'justify',
    prompt: '"An LLM call is not a real reranker, and pure-Python BM25 is not a real search engine. Isn’t this just a worse vector database?" Best defence?',
    choices: [
      'It is faster than a managed vector store at any corpus size because there is no network hop.',
      'For one report chunked into a few dozen pieces, exhaustive scoring is exact — an ANN index buys recall-per-millisecond at a scale we do not have, so we would be paying for infrastructure to approximate something we can simply compute. The rerank is the honest compromise: it gets the cross-encoder’s actual benefit, scoring query and document together, without a native download AppLocker blocks. It is best-effort, not benchmarked, and ADR 015 says so.',
      'Reciprocal Rank Fusion is mathematically equivalent to a cross-encoder, so no accuracy is lost.',
      'A managed vector store would be the right call, but the Phase 6 budget was not approved, so this is a temporary stand-in.',
    ],
    correctIndex: 1,
    whyWrong: [
      'It is faster at this corpus size, and avoiding the hop is a real advantage. "At any corpus size" is the part that is wrong and the part an assessor will pull on — exhaustive scoring is the first thing to stop scaling.',
      '',
      'RRF combines two rankings that each scored query and document separately; a cross-encoder scores them together. They are different operations, and claiming equivalence gives away the one thing the rerank actually buys.',
      'This concedes the design is wrong and then blames procurement. The binding constraint was AppLocker, and the shipped approach is defensible on its own terms at a single-document corpus.',
    ],
    explain: 'Name the scale at which the simple thing is not merely adequate but exact, name the real constraint, and concede the limitation the ADR already concedes.',
  },
  {
    id: 'r10', moduleId: 'rag', kind: 'mcq',
    prompt: 'Azure is configured, chat answers work, but every /rag/ask response reports hybrid = false. What is the most likely cause?',
    choices: [
      'The embedding call is failing, so retrieval fell back to BM25 alone',
      'The rerank step is disabled, which turns hybrid off',
      'top_k is set too low for fusion to run',
    ],
    correctIndex: 0,
    whyWrong: [
      '',
      'Rerank has its own flag, reranked. hybrid only reports whether dense embeddings were available to fuse with BM25.',
      'top_k limits what goes into the answer prompt after fusion; it does not decide whether there are two rankings to fuse.',
    ],
    explain: 'On 2026-09-24 this was DK-13: the .env endpoint was a Foundry project URL whose /openai/v1 route serves chat but 404s on embeddings. normalize_openai_base_url() now strips the project path. Chat working proves nothing about embeddings.',
  },
  // 10 Ethics
  { id: 'e1', moduleId: 'ethics', kind: 'numeric', prompt: 'Equalized-odds difference for age?', answer: MODEL.eodAge, tolerance: 0.005, explain: `${MODEL.eodAge}; state is ${MODEL.eodState}.` },
  {
    id: 'e2', moduleId: 'ethics', kind: 'mcq',
    prompt: 'Equalized odds compares groups on…',
    choices: ['Average score', 'True-positive and false-positive rates', 'Number of customers'],
    correctIndex: 1,
    whyWrong: [
      'Average score says nothing about where the errors land — two groups can share a mean and still be wrong about each other’s members at very different rates.',
      '',
      'Group size changes how noisy the estimate is, not what the metric measures. A small group can still show a large gap.',
    ],
    explain: 'EOD = largest gap in TPR or FPR between groups.',
  },
  {
    id: 'e3', moduleId: 'ethics', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['Fairness blocks a model release if EOD > 0.10', 'The 65+ band is flagged most often at the ops cut', 'No fairness remediator is shipped'],
    correctIndex: 0,
    whyWrong: [
      '',
      'True — the 65+ band carries the highest selection rate at the ops cut, and that number is disclosed rather than corrected.',
      'True, and deliberate under ADR 012: the gap is measured and published, not quietly adjusted away.',
    ],
    explain: 'Measured and disclosed only (ADR 012).',
  },
  {
    id: 'e4', moduleId: 'ethics', kind: 'mcq',
    prompt: 'Why does src/serving/fairness.py exist as the only reader of the Fairlearn report (ADR 015)?',
    choices: ['To recompute equalized odds on every request', 'Because hand-copied numbers in the Model Card and dashboard had already drifted once (red-team RT-J-04)', 'Because the Sprint 2 notebook was deleted'],
    correctIndex: 1,
    whyWrong: [
      'It reads a report the notebook produced; it does not recompute anything. Putting a training-time computation on the serving path would be both slow and a second source of truth.',
      '',
      'The notebook is intact and still owns the computation. The accessor exists because its numbers were being copied out by hand into other documents.',
    ],
    explain: 'One code path, exposed as GET /model/fairness behind the same view_glass_box gate as /model/glass-box. The notebook still owns the computation.',
  },
  {
    id: 'e5', moduleId: 'ethics', kind: 'justify',
    prompt: 'Jamie: "Customers aged 65+ are flagged roughly three times as often as everyone else. Why is this model allowed to run at all?" Best defence?',
    choices: [
      'The gap sits below our 0.10 equalized-odds release gate, so it is within the agreed tolerance.',
      'I would not claim it is fair. We have not separated genuine drawdown behaviour in retirement from model bias, so the honest position is that the cause is unknown. What makes running it defensible is narrower: the model only ranks, a human approves every flagged customer, the outcome is a retention email rather than an adverse action, and the numbers are disclosed to Risk under ADR 012. If you want that turned into a release gate, the limits are yours to set and I would implement them.',
      'age_years carries low global SHAP compared with Running_Balance_Rounded, so age is not materially driving the flag.',
      'The scoring path reweights the 65+ band so that selection rates equalise before drafts are generated.',
    ],
    correctIndex: 1,
    whyWrong: [
      'There is no release gate. The 0.10 figure is a notebook flag, and calling it an agreed tolerance claims a governance decision that nobody has made.',
      '',
      'The SHAP ranking is accurate and balance genuinely dominates the model. But a low-attribution feature can still coincide with a large gap in who gets selected — attribution and selection rate are different measurements, and Jamie asked about the second one.',
      'No remediator is shipped (ADR 012). Describing one turns a disclosed gap into a false statement to the person accountable for disclosing it.',
    ],
    explain: 'Never defend the gap. Defend the containment around it — and name what would have to be true (agreed numeric limits) for it to become a gate. There is no gate and no remediator (anti-claims #24, #9).',
  },
  // 11 Deploy
  {
    id: 'x1', moduleId: 'deploy', kind: 'mcq',
    prompt: 'What does the Docker image run?',
    choices: ['FastAPI and Streamlit', 'FastAPI only', 'Only the training notebook'],
    correctIndex: 1,
    whyWrong: [
      'The natural guess, because the demo needs both. The image packages the service; the UI is run separately against it.',
      '',
      'Training is not in the image at all — the booster is committed under Models/ops (ADR 005), so serving never trains.',
    ],
    explain: 'Streamlit is not in the image.',
  },
  {
    id: 'x2', moduleId: 'deploy', kind: 'false-claim',
    prompt: 'Which statement is FALSE?',
    choices: ['A CI pipeline runs the Python test suite on every push', 'ACA was deployed, verified and then torn down on 2026-09-24', 'Azure calls need valid credentials and unavailable paths have a fallback'],
    correctIndex: 0,
    whyWrong: [
      '',
      'True — ADR 016 records the successful demo deployment and teardown. There is no standing URL.',
      'True — historical live checks do not guarantee current service availability. Fallback is disclosed and cannot grant marked mastery credit.',
    ],
    explain: 'The only workflow checks this teaching app (lint, tests, build). The Python suite that tests the model and API is run by hand.',
  },
  {
    id: 'x3', moduleId: 'deploy', kind: 'mcq',
    prompt: 'Why is maxReplicas 1?',
    choices: ['Cost', 'SQLite on separate replicas would diverge (split-brain)', 'Azure limits'],
    correctIndex: 1,
    whyWrong: [
      'One replica is cheaper, but cost is a preference you could overrule with budget. This one you cannot buy your way out of without changing the state layer.',
      '',
      'Azure Container Apps will scale past one replica happily. The ceiling comes from the draft and audit store, not the platform.',
    ],
    explain: 'ADR 008.',
  },
  {
    id: 'x4', moduleId: 'deploy', kind: 'justify',
    prompt: 'An assessor: "So nothing is actually running in production. Isn’t the project incomplete?" Best defence?',
    choices: [
      'It is effectively in production — the container runs on demand and only the public URL is outstanding.',
      'A single-replica ACA demo was deployed, verified and then torn down on 2026-09-24. That proves deployment, not production operations. There is no standing URL, the later API-key gate still needs a live check, and production identity and Python CI remain future work. SQLite limits us to one replica; moving to Postgres is needed before scaling out.',
      'ACA is deployed but scaled to zero replicas to control demo cost, so it is live in the sense that matters.',
      'The Dockerfile packages FastAPI and Streamlit together, so a single deploy step is all that remains.',
    ],
    correctIndex: 1,
    whyWrong: [
      'The container does run on demand, so this starts from something true. It then overstates the rest, and "only the URL is outstanding" is disproved by one question about the URL.',
      '',
      'The verified demo was torn down, rather than left deployed at zero replicas. These are different states and ADR 016 records which occurred.',
      'The image carries the FastAPI service only. More importantly the blocker is not packaging — it is that the draft and audit store cannot be shared across replicas.',
    ],
    explain: 'Distinguish a verified demo deployment from a standing production service. SQLite permits the single-replica demo; Postgres is required before scaling out, not before any ACA deployment.',
  },
  {
    id: 'x6', moduleId: 'deploy', kind: 'false-claim',
    prompt: 'Which statement about the 2026-09-24 Docker smoke run is FALSE?',
    choices: [
      'The Dockerfile had been reviewed in July, so the first live run found nothing new',
      'The fairness and RAG endpoints failed in the container because their input files were dockerignored',
      'The image now installs pinned serving-only dependencies instead of requirements.txt',
    ],
    correctIndex: 0,
    whyWrong: [
      '',
      'True (DK-08). .dockerignore excluded all of Docs/, and both endpoints read a file from there at runtime. Two ! rules and two COPY lines fixed it.',
      'True (DK-02 / DK-07). requirements.serving.txt pins scikit-learn to the version that pickled the preprocessor, and the image dropped to 723 MB.',
    ],
    explain: 'The July review was static. Running the checklist found three high-severity bugs (DK-07, DK-08, DK-09) that reading the files had not.',
  },
  // Consequence diagnostics — "change one thing, predict what moves". A definition
  // can be recited; a downstream consequence has to be reasoned about.
  {
    id: 'm12', moduleId: 'ml', kind: 'mcq',
    prompt: 'You raise the decision threshold. What happens to recall, and what happens to PR-AUC?',
    choices: [
      'Recall falls, PR-AUC falls with it — a smaller queue is a worse model',
      'Recall falls; PR-AUC is unchanged, because the ranking was never reordered',
      'Recall rises, because there are fewer false alarms; PR-AUC unchanged',
      'Both are unchanged until the threshold crosses the base rate',
    ],
    correctIndex: 1,
    whyWrong: [
      'This conflates the two questions the module exists to separate. PR-AUC scores the ordering of the whole list; the threshold only decides how far down that fixed ordering the team walks.',
      '',
      'Raising the cut means flagging fewer people, so you catch fewer churners and recall falls. Precision generally rises, which is what people are remembering when they say the queue got better.',
      'There is nothing special about the base rate here. Every move of the threshold changes the queue immediately, and none of them changes PR-AUC.',
    ],
    explain: `Raise the cut, flag fewer people: recall falls, precision usually rises, and PR-AUC ${MODEL.prAuc.model} does not move. That is model quality ≠ decision threshold in one sentence.`,
  },
  {
    id: 'd6', moduleId: 'data', kind: 'mcq',
    prompt: 'Which of these would actually smuggle future information into a feature row for observation month t?',
    choices: [
      'gone_this_month, because it is almost the same as the label',
      'A centred 3-month rolling mean at t that includes the future month t+1',
      'Running_Balance at month t, because balance is what the label is built from',
      'The customer’s state, because it was recorded when the account opened',
    ],
    correctIndex: 1,
    whyWrong: [
      'Tempting, and wrong for the reason that matters: it is a month-t observation, knowable at scoring time before the label exists. It agrees with the label only ~82% of the time and is the baseline heuristic the model has to beat.',
      '',
      'Balance at month t is knowable at month t. Sharing a variable with the label definition is not leakage; using a value that does not yet exist is.',
      'A value recorded in the past cannot carry information from the future. Stale is not leaky.',
    ],
    explain: 'The test is always the same: at scoring time in production, before the label exists, could I compute this? A centred window that includes t+1 fails. A trailing window ending at t can be safe.',
  },
  {
    id: 'm13', moduleId: 'ml', kind: 'mcq',
    prompt: 'You cut the learning rate η by a factor of ten and leave the number of boosting rounds unchanged. What do you expect?',
    choices: [
      'Underfitting — the ensemble takes too small a step per round to reach the loss it would otherwise reach',
      'Better generalisation for free, because smaller steps are a form of regularisation',
      'Overfitting, because each tree now fits its residual more precisely',
      'No change — η only affects training time, not the final ensemble',
    ],
    correctIndex: 0,
    whyWrong: [
      '',
      'Small η does help generalisation, but only when the round count grows to compensate. Held fixed, you have removed capacity rather than added regularisation, and the training metrics fall too — which an overfit never does.',
      'η is applied after the tree is grown: it scales the leaf weights before they are added, and does not change what the tree learned.',
      'η and the number of rounds trade off directly. Halve one and you need roughly to double the other to land in the same place.',
    ],
    explain: 'Prediction = base + η×Tree₁ + η×Tree₂ + … Shrink η without adding rounds and the sum stops short of the optimum.',
  },
  {
    id: 'd7', moduleId: 'data', kind: 'justify',
    prompt: 'Why is re-running test evaluation with frozen code fine, while changing max_depth after looking at test AUC is a statistical sin?',
    choices: [
      'Because the first is cheap and the second is expensive, so the second needs sign-off.',
      'Because identical frozen code on identical data is repeated computation and learns nothing, whereas letting a test result change a hyperparameter makes the holdout a training signal. The rule is one decision-making exposure, not "look once".',
      'Because the test set is large enough to absorb one re-read, but not a second round of tuning.',
      'Because re-running is allowed as long as you report only the first result you saw.',
    ],
    correctIndex: 1,
    whyWrong: [
      'Cost has nothing to do with it. A free change driven by a test result contaminates the holdout exactly as much as an expensive one.',
      '',
      'Sample size is not the mechanism. Even an enormous test set is compromised once its results start steering your choices.',
      'Reporting the first number does not undo the decision. If what you shipped was chosen because of a later test result, the reported estimate is optimistic regardless of which figure you print.',
    ],
    explain: 'Repeated computation is safe; repeated feedback is the leak. Freeze the pipeline — model, fitted preprocessor and threshold — then evaluate, and let no decision flow backwards.',
  },
  {
    id: 'x5', moduleId: 'ethics', kind: 'justify',
    prompt: 'Suppose the false-negative rate were much higher for one demographic group than another. What would that mean here?',
    choices: [
      'That group is being discriminated against by the model, and the release must be blocked until parity is reached.',
      `That group’s at-risk customers reach the review queue less often, so they are under-served by outreach rather than adversely acted upon. It is a true-positive-rate gap — exactly what equalized odds measures — and it would need investigating before anyone could say whether it was bias or a real behavioural difference.`,
      `Little: recall at the ops cut is only about ${Math.round(MODEL.opsRecall * 100)}%, so everyone is missed most of the time anyway.`,
      'It would be invisible to us, because we measure selection rates rather than error rates by group.',
    ],
    correctIndex: 1,
    whyWrong: [
      'A gap is evidence to investigate, not a proven mechanism. It could reflect a genuine difference in drawdown behaviour, and forcing parity before understanding the cause would degrade the model without establishing that anyone was harmed.',
      '',
      'Low overall recall does not excuse an uneven distribution of the misses. The question is whether the missing is patterned by group, which is a different measurement.',
      `We do measure error-rate differences: equalized odds is reported at ${MODEL.eodAge} for age and ${MODEL.eodState} for state, behind a single accessor so the numbers cannot drift.`,
    ],
    explain:
      'A false-negative gap is an under-service harm, not an adverse-action harm, which is why ADR 012 discloses these numbers for review rather than gating on them. The honest position is that the gap is measured and bias has not yet been separated from behaviour.',
  },
  {
    id: 'r9', moduleId: 'rag', kind: 'numeric',
    prompt: `Before the Sprint 5 chunking fix, roughly what percentage of the Official report did a top-${RAG_CHUNKING.topK} retrieval hand to the LLM?`,
    answer: RAG_CHUNKING.beforeCoverage * 100,
    tolerance: 3,
    unit: '%',
    explain: `~${Math.round(RAG_CHUNKING.beforeCoverage * 100)}%: splitting on # and ## only gave ${RAG_CHUNKING.beforeChunks} chapter-sized chunks, so three of them were most of the document. H1–H6 splitting at ≤${RAG_CHUNKING.afterMaxChars} chars took it to ~${(RAG_CHUNKING.afterCoverage * 100).toFixed(1)}%.`,
  },
];

/** Final mastery quiz items join the review pool, tagged with the module they test. */
const QUIZ_MODULE: Record<string, ModuleId> = {
  q1: 'problem', q2: 'problem', q3: 'ml', q4: 'friction', q5: 'rag', q6: 'workflows',
  q7: 'ml', q8: 'deploy', q9: 'ml', q10: 'data', q11: 'ml', q12: 'serving',
};

/**
 * quiz.ts owns its own shape and is maintained separately, so its items arrive
 * without per-distractor feedback. Widen them here with one blank entry per
 * choice: the renderer skips empty strings, so a quiz item falls back to its
 * `explain` text exactly as before.
 */
function fromQuiz(q: (typeof QUIZ)[number], moduleId: ModuleId): ChoiceQuestion {
  return { ...q, kind: 'mcq', moduleId, whyWrong: q.choices.map(() => '') };
}

export const REVIEW_POOL: Question[] = [
  ...QUESTIONS,
  ...QUIZ.map((q) => fromQuiz(q, QUIZ_MODULE[q.id] ?? 'mastery')),
];

export function questionsFor(moduleId: ModuleId): Question[] {
  return QUESTIONS.filter((q) => q.moduleId === moduleId);
}

export function isCorrect(q: Question, answer: number | null): boolean {
  if (answer === null || Number.isNaN(answer)) return false;
  if (q.kind === 'numeric') return Math.abs(answer - q.answer) <= q.tolerance + 1e-9;
  return answer === q.correctIndex;
}

/**
 * A module check passes only on clean answers: correct on the first attempt of a
 * fresh presentation. Retrying after the answer has been revealed still feeds
 * spaced review, but it does not clear the check — you have to meet the question
 * again cold, here or in Practice.
 */
export function moduleCheckPassed(moduleId: ModuleId, cards: Record<string, { cleanPass?: boolean }>): boolean {
  const qs = questionsFor(moduleId);
  return qs.length > 0 && qs.every((q) => cards[q.id]?.cleanPass);
}
