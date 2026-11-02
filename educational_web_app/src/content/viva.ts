/**
 * Explain-it practice: open questions with a model answer and a rubric of key
 * points for self-grading, plus one adversarial follow-up each — the assessor
 * rarely stops at the first answer. ML / MLflow answers reuse the approved
 * wording in Docs/Engineering/Corrections_and_Future_Work.md (A1, A7).
 */
import type { ModuleId } from './modules';
import {
  AUM_AT_RISK,
  AZURE_RESILIENCE,
  GENAI,
  MODEL,
  OPS_MATH,
  RAG_015,
  RAG_CHUNKING,
  STREAMLIT_ROUTING,
  TEMPORAL_SPLIT,
  formatOpsThreshold,
} from './facts';

/** The pushback that follows the first answer. Rehearse this, not just the opener. */
export interface VivaChallenge {
  prompt: string;
  answer: string;
}

export interface VivaPrompt {
  id: string;
  moduleId: ModuleId;
  prompt: string;
  rubric: string[];
  modelAnswer: string;
  challenge: VivaChallenge;
}

/** Share of a prompt's rubric you must have covered for it to count as cleared. */
export const VIVA_PASS_RATIO = 0.8;
/** Minimum words before an answer can be marked. Mirrors viva_grader.MIN_WORDS. */
export const VIVA_MIN_WORDS = 40;

/** One rubric point as the marker returned it (ADR-EDU-003). */
export interface RubricVerdict {
  index: number;
  point: string;
  covered: boolean;
  /** The learner's own sentence the marker accepted as making the point. */
  evidence: string;
  /** Why it was not accepted. Only set when `covered` is false. */
  comment: string;
}

/** A marking result, as stored against a prompt. */
export interface GradeResult {
  promptId: string;
  /** The API answered at all. False only when the request never got a response. */
  reachable: boolean;
  /** The answer was actually marked. False can still mean the API was reachable. */
  available: boolean;
  cleared: boolean;
  coveredCount: number;
  totalPoints: number;
  points: RubricVerdict[];
  feedback: string;
  /** Why marking could not run. Only set when `available` is false. */
  reason: string;
  gradedAt: number;
}

/** A saved mark is valid only for the question and rubric it was awarded against. */
export function vivaSignature(prompt: VivaPrompt): string {
  return JSON.stringify([prompt.prompt, prompt.rubric]);
}

export const VIVA: VivaPrompt[] = [
  {
    id: 'v-problem',
    moduleId: 'problem',
    prompt: 'In two minutes: what problem does Meridian solve, what does the system deliberately NOT do, and how do stakeholder frameworks govern it?',
    rubric: [
      'Silent churn: accounts drained, not closed',
      `${AUM_AT_RISK.display} historical AUM at risk (baseline, not savings)`,
      'Model ranks; top ~5% capacity cut decides who is contacted',
      'GenAI only drafts; a human approves; nothing is sent by the system',
      'Stakeholder governance: CATWOE/RASCI single accountability (Sam ML, Morgan ROI, Jamie Risk) and POPIT human bias controls',
    ],
    modelAnswer: `Retail savers rarely close accounts; they drain them, so by the time a close flag appears the money is gone. Historically about ${AUM_AT_RISK.display} of balances left this way. Meridian predicts next month's drain-out from this month's behaviour, ranks customers, and puts the top ~5% in front of a retention team. For flagged customers an Azure OpenAI model drafts a retention email, but a person must approve it and Approve does not send anything — outreach happens outside the system.`,
    challenge: {
      prompt: `"${AUM_AT_RISK.display} is a historical number you already had in the data. It is not money you saved. So what has this project actually delivered?"`,
      answer: `Agreed — it is a sizing number, not a benefit claim, and I would not present it as savings. What it justifies is building something at all. What the project has delivered is a ranked queue that beats the obvious heuristic on a time-based holdout, and a set of controls Risk can audit. Proving retained AUM would need a controlled comparison between contacted and not-contacted customers over several months, which we have not run and which I would scope as the next piece of work rather than assert now.`,
    },
  },
  {
    id: 'v-leakage',
    moduleId: 'data',
    prompt: 'How did you make sure the model never saw the future?',
    rubric: [
      'Label is month t+1; features stop at month t',
      'Lags/rolls shifted before rolling',
      'Chronological fit / validation / test split, no shuffling, no CV folds',
      'Threshold chosen on validation only; one decision-making exposure — the pipeline is frozen before test evaluation, with no tuning feedback loop',
      'Sanity check: gone_this_month matches the label only ~82% of the time',
    ],
    modelAnswer: `The label (ADR 004) is the state of month t+1: rounded balance zero and no active transactions. Every feature is computed from month t or earlier, and lag and rolling features are shifted before rolling so they cannot include t+1. The data is split by time — fit ${TEMPORAL_SPLIT.fit}, validation ${TEMPORAL_SPLIT.val}, test ${TEMPORAL_SPLIT.test} — with no shuffling and no cross-validation folds. The threshold was picked on validation, and the whole pipeline — booster, fitted preprocessor and threshold — was frozen before the test window was scored. The test set is used once in the sense that matters: as an independent final evaluation of a frozen champion, after every model-selection decision has already been made. I do not use test-set feedback to tune or select anything. As a sanity check, the current-month "gone" flag agrees with the label only about 82% of the time, which shows the label really is next month.`,
    challenge: {
      prompt: '"You said the test set is used once, but your notebook clearly scores it more than once. Which is it?"',
      answer: 'Both, and the distinction is the point. You can rerun scoring as many times as you like for bug-checks or reproducibility without any penalty: identical frozen code over identical data is repeated computation, and nothing learns anything. The statistical violation is a feedback loop — reading a test number, changing a hyperparameter or a threshold because of what you read, and then checking against the same test set again. At that point I have become the optimiser and the holdout has become a training signal, so the number it reports stops being an estimate of unseen performance. So the rule I hold myself to is not "look once", it is one decision-making exposure: freeze the pipeline first, then evaluate, and let no decision flow backwards from the result. In Meridian the threshold and every hyperparameter were settled on the validation window, which is the window that is allowed to receive feedback.',
    },
  },
  {
    id: 'v-leakage-feature',
    moduleId: 'data',
    prompt: 'An assessor points at gone_this_month and calls it leakage. Answer them.',
    rubric: [
      'gone_this_month is a month-t observation — knowable at scoring time, before the label exists',
      'Leakage is a timing property, not a correlation strength',
      'It is not the label: they agree only ~82% of the time',
      'It is the baseline heuristic the model has to beat',
      `Model beats it: PR-AUC ${MODEL.prAuc.model} vs ${MODEL.prAuc.heuristic}`,
    ],
    modelAnswer: 'I would concede the general point first: a chronological split does not, on its own, stop a single row from carrying future information, so pointing at the split would be a weak defence. What makes this particular feature safe is that gone_this_month is a month-t observation: it is knowable at scoring time, in production, before the label exists. And it is not the label: it agrees only about 82% of the time. It is a strong legitimate signal, which is exactly why the baseline the model has to beat is that flag used on its own — and the model beats it on PR-AUC 0.219 to 0.151.',
    challenge: {
      prompt: '"Then your model is mostly rediscovering a flag you already had. What is the 0.219 really buying?"',
      answer: `It is buying ordering among the customers the flag cannot separate. The heuristic is binary: it tells you who is already at zero this month and nothing about how urgent the rest are. PR-AUC ${MODEL.prAuc.heuristic} to ${MODEL.prAuc.model} and ROC-AUC ${MODEL.rocAuc.heuristic} to ${MODEL.rocAuc.model} on a time-based holdout is the measured size of that gain, and I would not inflate it — it is a real but moderate lift, not a transformation. What it enables operationally is the top-5% queue: you cannot take the top 5% of a binary flag.`,
    },
  },
  {
    id: 'v-selection',
    moduleId: 'ml',
    prompt: 'How did you choose the model and the threshold? Why not just take the best AUC or max-F1?',
    rubric: [
      'Two questions: ranking quality vs who to contact',
      `Beat the heuristic: PR-AUC ${MODEL.prAuc.model} vs ${MODEL.prAuc.heuristic}, ROC-AUC ${MODEL.rocAuc.model} vs ${MODEL.rocAuc.heuristic}`,
      '40% precision floor unreachable (top 1% ≈ 24%) — documented, not faked',
      `Capacity cut: top 5% (${formatOpsThreshold()}); FPs 249k → 20k`,
      'Fairness + SHAP reported for review, not an automatic gate; human approval',
      'Four separate things: model quality ≠ decision threshold ≠ operational policy ≠ business capacity',
    ],
    modelAnswer:
      "I didn't just take the run with the best AUC, and I didn't use F1 either. I separated two questions. First, does the model rank customers better than a realistic baseline? On a time-based holdout, XGBoost beat the 'gone this month' rule on PR-AUC (0.219 vs 0.151) and ROC-AUC (0.723 vs 0.551). Second, who should actually be contacted? I treated that as a constrained optimisation on validation data only: maximise recall subject to a 40% precision floor and a 5% contact cap. The precision floor turned out to be impossible to reach on these scores (the top 1% was only about 24% precise), so rather than fake it, I documented that and set the threshold by team capacity: the top 5% of scores (t ≈ 0.701). That cut false positives from 249k to 20k without changing ranking quality. Fairness by age and state, plus SHAP, was reported to Risk for periodic review rather than used as an automatic gate, and every flagged customer still goes through human approval. The framing I would hold on to is that four different things get conflated in this question and they have four different owners: model quality (how well the ranking separates churners, measured by PR-AUC and ROC-AUC), the decision threshold (where the ranked list is cut), the operational policy (what happens to someone above the cut — here a drafted email a human must approve, never an automatic action), and business capacity (how many drafts the retention desk can genuinely review in a month). Moving the threshold changes the queue and changes none of the model quality numbers; changing the capacity changes the threshold and still changes none of them.",
    challenge: {
      prompt: '"So roughly three out of four people your agents contact were never going to leave, and you miss more than nine in ten of the ones who do. Why is that worth deploying?"',
      answer: `Both numbers are right — precision at the cut is about ${OPS_MATH.contactedPrecisionPct}% and recall about ${OPS_MATH.contactedRecallPct}%, and I would put them on the slide rather than wait to be asked. The defence is the comparison, not the absolute level. Against the realistic alternative — the "gone this month" rule, or contacting nobody — this ranks better, and the cost of a false positive here is one retention email a human chose to send, not an account closure or a declined application. Recall is low because the queue is capped at 5%, and that cap is Morgan's budget decision: if he funds more reviewers, the same model at the top 10% roughly doubles recall at essentially the same precision. What would change my answer is if the contact itself had a cost to the customer — then low precision would be a real harm and I would want calibration and a fairness gate first.`,
    },
  },
  {
    id: 'v-ops-math',
    moduleId: 'ml',
    prompt: 'Morgan asks what the top-5% cut buys and what it costs, in queue terms. Do the arithmetic out loud.',
    rubric: [
      `Max-F1 (t=${MODEL.maxF1Threshold}) floods the queue: ~${MODEL.maxF1FalsePositives.toLocaleString()} false positives on test`,
      `Ops cut: ~${MODEL.opsFalsePositives.toLocaleString()} FPs — roughly a ${OPS_MATH.fpReductionFactor}× reduction`,
      `Precision ≈ ${MODEL.opsPrecision}: about ${OPS_MATH.contactedPrecisionPct} of every 100 contacted actually churn`,
      `Recall ≈ ${MODEL.opsRecall}: the cut catches under a tenth of next-month churners`,
      'PR-AUC is unchanged — the model did not get better or worse, only the cut moved',
      'The cut is an ops decision owned by the budget holder, not a modelling optimum',
    ],
    modelAnswer: `Same model, two different cuts. At max-F1 (t=${MODEL.maxF1Threshold}) recall looks excellent but the queue is unusable: about ${MODEL.maxF1FalsePositives.toLocaleString()} false positives across the test window. At the ops cut that falls to about ${MODEL.opsFalsePositives.toLocaleString()} — roughly ${OPS_MATH.fpReductionFactor}× fewer — because we are only taking the top 5% of scores. What that buys is a queue a real team can work. What it costs is recall: precision is about ${MODEL.opsPrecision}, so roughly ${OPS_MATH.contactedPrecisionPct} in every 100 people an agent sees will actually churn, and recall is about ${MODEL.opsRecall}, so we catch under a tenth of next-month churners. PR-AUC is identical between the two runs, which is the point: nothing about the model changed, only where we drew the line. That line is your decision, not mine — it is set by how many drafts your team can genuinely review.`,
    challenge: {
      prompt: '"Fine. Then set it wherever recall is highest that we can still staff. Why does that need a data scientist at all?"',
      answer: `Honestly, that part does not need one — and I would rather say so than pretend the 0.701 is a discovered optimum. It is a quantile boundary: whatever score sits at the top-5% mark on the validation window. What needs a data scientist is everything either side of it: that the ranking is trustworthy (leakage-safe features, a time-based holdout, beating the heuristic), that the number does not get tuned on test, and that when you change the capacity we re-derive the cut on validation rather than eyeballing it on live data. The threshold is an ops dial; the guarantee that the dial means anything is the modelling work.`,
    },
  },
  {
    id: 'v-mlflow',
    moduleId: 'ml',
    prompt: 'What did you use MLflow for, and what is still missing?',
    rubric: [
      'SQLite backend because of corporate limits (ADR 009)',
      'Runs hold params, split, metrics vs baseline, threshold rule, SHAP/fairness/drift reports',
      'Served model exported from a specific run to Models/ops/ (ADR 005)',
      'Run ID returned by the API and stored on every draft',
      'Not yet: Model Registry with promotion aliases',
    ],
    modelAnswer:
      "I used MLflow, with a SQLite backend because of corporate antivirus limits (ADR 009), to track my XGBoost runs. Each run holds the hyperparameters, the time-based split, the metrics against the baseline, the threshold rule, and the SHAP, fairness and drift reports. The served model is exported from a specific run into a portable folder (ADR 005), and that run ID is returned by the API and saved on every draft, so any score traces back to its training run. Registering the model with promotion stages would be the next MLOps step.",
    challenge: {
      prompt: '"If the model is not in the Model Registry, what actually stops someone dropping a different booster into Models/ops/ and serving it?"',
      answer: 'Nothing technical, and that is the real gap — not the missing Registry UI. Today the control is git: Models/ops/ is committed, so a swap is a reviewable diff, and serving_meta.json carries the run ID that the API returns and every draft stores, so a mismatched model shows up as drafts citing a run that does not match the export. That is detective, not preventive. A Registry with promotion aliases would make it preventive: serving resolves a stage rather than a folder, and promotion is an audited action. I would pair that with a startup check that the loaded booster hashes to what serving_meta claims.',
    },
  },
  {
    id: 'v-shap',
    moduleId: 'ml',
    prompt: 'What do the SHAP drivers shown to reviewers actually mean?',
    rubric: [
      'Global mean |SHAP|, frozen in serving_meta.json',
      'Same five names for every customer — not a per-customer explanation',
      'Running_Balance_Rounded dominates',
      'Importance ≠ causation',
    ],
    modelAnswer:
      'They are the five features with the highest mean absolute SHAP value across a sample of scored rows, frozen into serving_meta.json at export. Every draft and the glass-box panel show the same list, so they describe what the model relies on overall, not why this particular customer was flagged. Running_Balance_Rounded dominates by a wide margin. They are useful context for Risk, but they are associations the model learned, not causes.',
    challenge: {
      prompt: '"Then the drivers on a draft are decoration. If an agent reads them as the reason this customer was flagged, you have built a misleading explanation."',
      answer: 'That is a fair risk and it is a labelling problem I would fix rather than defend. The list is honest about what the model relies on globally, and it is stable and cheap, but on a per-draft surface it invites exactly the misreading you describe. The correct fix is either to label it explicitly as "what this model generally relies on" rather than a per-customer reason, or to compute per-row SHAP at scoring time and show the actual local contributions. The second is the better answer and it is not shipped — per-customer SHAP in drafts is on our anti-claim list precisely so nobody says we have it.',
    },
  },
  {
    id: 'v-serving',
    moduleId: 'serving',
    prompt: 'Walk through what happens when an agent requests a draft for a customer.',
    rubric: [
      'Streamlit → FrictionGateClient → FastAPI (http, or inprocess ASGI fallback)',
      'Role checked from X-Demo-Role (403 + audit on deny)',
      'API re-scores raw features; client scores rejected (extra="forbid")',
      'Below threshold → 422, no LLM call',
      'Scrub → LLM/stub → sanitize → pending_review draft + audit row with run_id',
    ],
    modelAnswer: `The Streamlit page calls FrictionGateClient, which sends the request to FastAPI — over HTTP by default, or through an in-process ASGI client on the AppLocker machine. The API checks the demo role header and refuses with 403 (and an audit row) if the role cannot draft. It validates the raw features with a strict Pydantic model that forbids extra fields, re-scores them with the committed model and refuses with 422 unless ${formatOpsThreshold('p-gate')}, so no LLM call is made for unflagged customers. For flagged ones it scrubs the context, calls the drafter, scrubs and validates the output, and stores a pending_review draft plus an audit event carrying the run ID, threshold and drafter source.`,
    challenge: {
      prompt: '"Your RBAC is a header the client sets. I can send X-Demo-Role: retention_agent from curl. Why is any of this a control?"',
      answer: 'You can, and I would not call the role check a security control — it is a demo affordance for showing separation of duties, and Entra/SSO is explicitly future work rather than something I am claiming. What is a real control is the part a caller cannot influence: the API re-scores from raw features with extra="forbid", so even a caller who forges a role cannot forge a score, cannot obtain a draft for an unflagged customer, and cannot write a draft without an audit row carrying the run ID. In other words authentication is the missing piece and authorisation logic plus enforcement placement is the piece that is done. Wiring real identity in front of it does not change any of the routes.',
    },
  },
  {
    id: 'v-routing',
    moduleId: 'workflows',
    prompt: 'Why is the Streamlit app one large file instead of using Streamlit’s pages/ directory?',
    rubric: [
      `Rejected: ${STREAMLIT_ROUTING.rejected}`,
      'Page clicks fork a secondary Python subprocess',
      'AppLocker blocks that fork — the UI crashes or freezes',
      'Shipped: sidebar role selector + if/elif dispatch to view functions (ADR 011)',
      'Cost: a large file, needing strict function encapsulation and disciplined session-state keys',
    ],
    modelAnswer: `${STREAMLIT_ROUTING.why}. So ADR 011 rejects ${STREAMLIT_ROUTING.rejected} and uses programmatic routing instead: ${STREAMLIT_ROUTING.shipped}. State also stays in one session, which makes passing data between views simpler. The cost is honest — ${STREAMLIT_ROUTING.cost} — and it is the same pattern as ADR 001: when the environment blocks a subprocess, stop spawning subprocesses rather than fighting the policy.`,
    challenge: {
      prompt: '"This sounds like you built worse software to avoid arguing with your IT department."',
      answer: 'That framing is not wrong, and it is the trade I would make again in a prototype. The constraint is real and not mine to lift on this timescale: AppLocker blocks the fork, so pages/ does not merely look bad, it crashes the demo in front of the stakeholder. The routing pattern costs a larger file and some discipline around session-state keys; it costs no functionality the user can see. What it buys is that the thing runs where the bank actually is. If the policy were relaxed the change is mechanical — the view functions are already separate, so moving them into pages/ is a file split, not a rewrite.',
    },
  },
  {
    id: 'v-friction',
    moduleId: 'friction',
    prompt: 'How do you stop reviewers from rubber-stamping AI drafts?',
    rubric: [
      'Attention acknowledgement required by the API on Approve',
      `Fast approval (< ${GENAI.fastDecideSeconds} s) logged as a soft warning, not blocked`,
      'Compliance can audit but not approve (separation of duties)',
      'Approve ≠ Sent: no /send route',
      'Audit trail of approvals, denials and timing',
    ],
    modelAnswer: `Every Approve must carry an attention acknowledgement, which the API enforces. The UI measures how long the draft was open; approvals under ${GENAI.fastDecideSeconds} seconds are recorded as fast_decide_warn rather than blocked, because hard blocks just teach people to wait and click. Compliance can see every draft and audit event but cannot approve, and even an approval does not send anything — there is no send route. Together that makes rubber-stamping visible to Risk instead of silent.`,
    challenge: {
      prompt: '"A checkbox and a timer. An agent can tick the box in two seconds and you log a warning nobody reads. What has actually changed?"',
      answer: `The mechanism is weak on its own and I would not oversell it. What changed is that the behaviour became measurable: fast_decide_warn is a rate per reviewer that Risk can pull, so rubber-stamping stops being invisible and starts being a number someone owns. That is the design intent of ADR 003 — make the friction observable rather than theatrical. I would also be clear about what is missing: nobody is currently reviewing that rate on a schedule, and a warning nobody reads is exactly as useless as you say. The fix is a periodic Risk review with a threshold on the rate, not a longer timer — a longer timer just teaches people to wait ${GENAI.fastDecideSeconds} seconds.`,
    },
  },
  {
    id: 'v-genai',
    moduleId: 'genai',
    prompt: 'How do you keep the LLM from inventing an offer or leaking customer data?',
    rubric: [
      'Scrub before the call: blocked keys + regex redaction',
      'Structured JSON output parsed by Pydantic',
      `Rates above ${GENAI.rateCapDisplay} rejected; numeric percentage claims checked; drivers replaced with server list`,
      'Output scrubbed again',
      'Honest gap: free-text names are not detected',
    ],
    modelAnswer: `Before the call, the context drops blocked keys like name and customer_id and redacts emails, phones, SSNs, dates and long IDs. The model must return JSON, which is parsed into a Pydantic model. The code rejects rates above ${GENAI.rateCapDisplay}, checks numeric percentage claims against the offer, replaces generated drivers with the server's own SHAP list, and scrubs the subject and body again. Invalid Azure output uses the safe stub. A human still approves. One honest gap: the scrubber does not detect names written inside free text.`,
    challenge: {
      prompt: '"Your scrubber misses names in free text, which is the most likely PII in a retention note. So customer names do reach Azure."',
      answer: 'Yes. A name in free text can pass the regex filter. The code drops blocked identity fields and redacts common patterns, but it does not detect every name. Provider retention settings and contractual guarantees have not been verified. A human reviews output before sending, but that does not prevent exposure in an earlier provider call. Before real customer use, add named-entity detection or remove free-text context, and validate the provider policy separately.',
    },
  },
  {
    id: 'v-resilience',
    moduleId: 'genai',
    prompt: 'The Azure endpoint starts throwing 429s mid-demo. Walk through what happens and what the audit trail shows.',
    rubric: [
      `Tenacity retries with exponential backoff, max ${AZURE_RESILIENCE.maxAttempts} attempts (ADR 013)`,
      `Retries on ${AZURE_RESILIENCE.retryOn.slice(0, 3).join(', ')} and InternalServerError — pure Python, AppLocker-safe`,
      'Draft path then stub-falls-back: drafter_source = stub_fallback, not a crash and not a silent Azure draft',
      'RAG path returns a safe error string rather than failing the page',
      'Token counts logged via stdlib logging — no APM stack was invented',
      'Product semantics unchanged: still no /send, still human approval',
    ],
    modelAnswer: `One Azure resource serves both GenAI surfaces, so a rate-limit blip would otherwise take out the drafter and the Q&A bot together. ADR 013 wraps both call sites in ${AZURE_RESILIENCE.library}: exponential backoff, at most ${AZURE_RESILIENCE.maxAttempts} attempts, retrying ${AZURE_RESILIENCE.retryOn.join(', ')}. If it still fails, the drafter falls back to the stub and the draft is stored with drafter_source = stub_fallback — so the audit row tells you it was not an Azure draft, which matters because stub and stub_fallback mean different things: stub is "Azure was never configured", stub_fallback is "Azure was configured and failed". The RAG bot returns a safe error string instead of a stack trace. After a successful call we log prompt, completion and total tokens through standard logging, so Morgan can be shown what GenAI costs without us standing up a billing dashboard we have not deployed. The trade is extra latency under sustained 429s, bought for demo survivability.`,
    challenge: {
      prompt: '"So under load your compliance-critical system quietly swaps in a templated email and a reviewer may not notice. Is that not worse than failing loudly?"',
      answer: 'The swap is not quiet — the draft carries drafter_source = stub_fallback and the audit row records it, so it is distinguishable after the fact. But you are pointing at something real: distinguishable in the audit trail is not the same as obvious to the reviewer at the moment of approval, and if the UI does not badge a fallback draft clearly then in practice it is quiet. I would treat that as a UI defect worth fixing before go-live. On failing loudly: the stub draft is a template a human then reads, edits and approves, and nothing sends on its own, so the failure mode is a worse first draft rather than a wrong action. Failing loudly would be the right call if approval were automated — it is not, and that is what makes degrading acceptable here.',
    },
  },
  {
    id: 'v-rag',
    moduleId: 'rag',
    prompt: 'Explain your RAG design and why you did not use a vector database.',
    rubric: [
      `Corpus: ${GENAI.ragCorpus} only, for Methodology Q&A`,
      `Heading-aware chunks ≤ ${GENAI.ragChunkMaxChars} chars; top_k = ${GENAI.ragTopK}`,
      'Hybrid: BM25 + Azure dense embeddings, fused with Reciprocal Rank Fusion (ADR 015)',
      'LLM rerank on the existing chat deployment — no Cohere / BGE / native download',
      'Chroma/FAISS blocked by AppLocker (ADR 010); degrades to one signal, never hard-fails',
      'Behind POST /rag/ask since ADR 015 — the UI no longer imports rag_engine',
      'Not used by the email drafter',
    ],
    modelAnswer: `The Methodology Q&A bot answers questions about the official report, which is the only indexed document. It is split on markdown headings and packed into chunks of at most ${GENAI.ragChunkMaxChars} characters. ADR 010 ruled out Chroma and FAISS because AppLocker blocks their native binaries; ADR 015 then made retrieval hybrid rather than dense-or-sparse: ${RAG_015.sparse}, plus ${RAG_015.dense}, ranked independently and fused with ${RAG_015.fusion}. The fused candidates go through ${RAG_015.rerank}, and the top ${GENAI.ragTopK} chunks are handed to the LLM. ${RAG_015.degrade} Since ADR 015 the whole thing sits behind ${RAG_015.endpoint}, so Streamlit no longer imports rag_engine and FastAPI is the single enforcement point for every Azure-touching action. The retention drafter does not use RAG at all.`,
    challenge: {
      prompt: '"An LLM scoring its own candidates is not a reranker, and BM25 in a Python loop is not search. You have reinvented a vector database, badly."',
      answer: `Partly fair, and ADR 015 concedes the reranker point explicitly: it is best-effort, not a benchmarked cross-encoder, and it costs one extra chat round-trip per query. What I would push back on is "badly". For a single report of a few dozen chunks, scoring every chunk is exact — an ANN index exists to approximate what we can just compute, so at this scale a managed vector store would be infrastructure bought to be less accurate. The rerank does get the cross-encoder's actual mechanism, scoring query and document together rather than comparing separately-computed vectors, without a native download the environment blocks. What would force the change is scale: another document, or query volume where per-query LLM reranking is too slow or costly. ${RAG_015.stillOpen} — and retrieve() is isolated enough that swapping in a real hybrid search service does not change its shape.`,
    },
  },
  {
    id: 'v-fairness',
    moduleId: 'ethics',
    prompt: 'Is the model fair? What would you say to Jamie?',
    rubric: [
      `Age EOD ${MODEL.eodAge}, state EOD ${MODEL.eodState} — not "bias-free"`,
      '65+ flagged ~14.6% vs ~4.6–4.9% for most bands',
      'Could be real churn difference or bias — not yet investigated',
      'ADR 012: disclose + periodic review, no automated gate or remediator',
      'ADR 015: one accessor (GET /model/fairness) so the numbers cannot drift again',
      'Next step: agree numeric limits with Risk, then gate',
    ],
    modelAnswer: `I wouldn't call it fair or unfair without more work. Equalized-odds differences are ${MODEL.eodAge} for age and ${MODEL.eodState} for state, and at the ops cut customers aged 65+ are flagged about three times as often as most bands. That might reflect real drawdown behaviour or it might be bias; we have not separated the two yet. Under ADR 012 we disclose these numbers for periodic review rather than blocking releases, and every flagged customer still passes human approval. Since ADR 015 there is exactly one code path reading the Fairlearn report — ${RAG_015.fairnessAccessor} — because ${RAG_015.fairnessWhy}. The next step is to agree limits with Risk and make them a release gate.`,
    challenge: {
      prompt: '"Three times the flag rate for over-65s, and your answer is that you will keep measuring it. Why should I let this run?"',
      answer: 'Because of what a flag actually does here, not because the number is acceptable — I am not defending the gap. A flag puts a customer in a queue where a human decides whether to send a retention email. It is not an adverse action: nobody is declined, priced differently, or restricted. So the harm from over-flagging the 65+ band is a higher chance of being offered help, which is an odd thing to want to equalise before understanding it — and the plausible cause, retirees drawing down savings, is the behaviour the model is meant to detect. What I cannot yet tell you is how much of the gap is that and how much is bias, and I would not claim otherwise. What I would accept from you is a numeric limit: pick the EOD you are willing to ship and I will make it a release gate rather than a disclosure. Today there is no gate and no remediator, and I would rather say that plainly than imply a control we do not have.',
    },
  },
  {
    id: 'v-calibration',
    moduleId: 'ml',
    prompt: 'Why can’t you tell an interviewer that a Meridian score of 0.8 means an 80% churn probability?',
    rubric: [
      'The score is uncalibrated — it was never trained to match observed frequencies',
      'scale_pos_weight up-weights the minority class, shifting the output distribution',
      'The objective rewards ranking separation, not posterior accuracy',
      `Evidence: even the top 1% of validation scores is only ~${Math.round(MODEL.top1PctPrecision * 100)}% precise`,
      'The API field churn_probability is documented legacy naming debt, not a claim',
      'Correct phrasing: an uncalibrated ranking score, meaningful relative to other customers',
    ],
    modelAnswer: `Because calibration is a testable property the model does not have. A calibrated 0.8 would mean that of every hundred customers scored around 0.8, about eighty churn next month. Ours were trained with scale_pos_weight to up-weight the ${(MODEL.baseRate * 100).toFixed(1)}% minority class, so the loss treats one churner as worth many non-churners. That buys ranking separation — which is what we wanted, and what PR-AUC ${MODEL.prAuc.model} against ${MODEL.prAuc.heuristic} measures — and it costs the correspondence between the output and the observed frequency. The evidence is in our own slices: the top 1% of validation scores was only about ${Math.round(MODEL.top1PctPrecision * 100)}% precise, nowhere near what a calibrated high-score bucket would imply. So the defensible sentence is that the customer sits high on an uncalibrated ranking score, which is why they are above the ops cut and in the review queue. I would also flag before being asked that the serving field is named churn_probability: that is legacy naming debt from before this was settled, documented rather than silently renamed because the contract is published.`,
    challenge: {
      prompt: '"Then fix it. Calibration is a few lines of scikit-learn. Why is your API still shipping a field called churn_probability?"',
      answer: `Fair, and I would not defend the field name — it is debt. Two separate pieces of work sit behind it. Calibration itself is cheap to fit (Platt scaling or isotonic regression on a held-out slice) but not cheap to ship honestly: it needs its own untouched slice so I am not calibrating on the window I then report, and it needs a reliability diagram in the model card so the claim can be checked rather than asserted. Renaming the field is a breaking change to a published contract that Streamlit and the draft store both read, so it needs a versioned route rather than an edit. What I would not do is calibrate and keep quiet about which slice it was fitted on, because then the probability claim is as unfounded as the one I am currently refusing to make. Today the correct behaviour is what we do: rank, cut by capacity, and say plainly that the number is not a probability.`,
    },
  },
  {
    id: 'v-learning-rate',
    moduleId: 'ml',
    prompt: 'What happens to XGBoost if you dramatically reduce the learning rate but keep the number of boosting rounds fixed?',
    rubric: [
      'Underfitting: the ensemble stops short of the loss it would otherwise reach',
      'η scales each tree’s leaf weights before they are added — it is shrinkage, not a change to what the tree learned',
      'η and the number of rounds trade off; shrinking one without growing the other loses capacity',
      'Not regularisation-for-free: the symptom looks like a weak model, not an overfit one',
      'Boosting is additive — no epochs or minibatches; each round appends a tree to a sum',
    ],
    modelAnswer: `It underfits. Boosting is additive: the prediction is a base score plus η times each tree’s leaf weights, and those leaf weights come from the loss gradients — the negative gradient sum over a leaf divided by the hessian sum plus regularisation. η is a shrinkage factor applied after the tree has been grown, so cutting it does not make the trees worse, it makes each correction smaller. With the round count fixed, the ensemble simply takes too few steps of too small a size to reach the loss it would otherwise reach, and stops short of the optimum. η and the number of rounds are a trade-off pair: halve η and you roughly need to double the rounds to end up in the same place. The failure mode is worth naming because it is easy to misread — you see poor training and validation metrics and reach for more features or a different model, when the ensemble was never allowed to finish. It is also worth saying what is not happening: there are no epochs, no minibatches and no backpropagation, and nothing already in the ensemble is revised.`,
    challenge: {
      prompt: '"So small η is just a slower version of large η. If I give you unlimited rounds, why would anyone tune it at all?"',
      answer: `Because the two are not equivalent even at equal final loss, and that is the whole reason shrinkage exists. Each tree fits the current residual imperfectly — partly signal, partly noise in this particular training sample. At large η that noise is applied at nearly full weight, so the ensemble lurches and the path it takes depends heavily on the first few trees; at small η no single tree can move it far, and many small corrections average the noise out. The result is a smoother, better-generalising ensemble even when the training loss matches. What you pay is compute and, with early stopping, a longer patience window. The practical cost is real on this data, which is why it is a tuned parameter and not a constant.`,
    },
  },
  {
    id: 'v-test-discipline',
    moduleId: 'data',
    prompt: 'An engineer claims: "Running scoring code twice on the test set invalidates the holdout." How do you correct them?',
    rubric: [
      'Repeated computation is safe: identical frozen code on identical data changes nothing',
      'The violation is a feedback loop: a test result influencing a change that is then re-checked on test',
      'The rule is one decision-making exposure, not "look once"',
      'The pipeline (model + preprocessor + threshold) is frozen before test evaluation',
      'Tuning feedback belongs on the validation window',
      'It applies to any decision — hyperparameters, threshold, features, or which run to ship',
    ],
    modelAnswer: `They have the right instinct and the wrong mechanism, so I would separate the two things they are merging. Re-running identical frozen code over the test set is repeated computation: the job crashed, a reviewer wants to reproduce the metric card, I am chasing a bug. Same inputs, same number, nothing has learned anything, no penalty. What actually contaminates a holdout is repeated feedback — I read a test result, change max_depth or the threshold because of what I read, and evaluate again. At that point I am the optimiser and the test set is my training signal, so the number it reports is no longer an estimate of unseen performance. That is why I would state the rule as one decision-making exposure rather than "use it once": the whole pipeline — booster, fitted preprocessor and threshold — is frozen before the test window is scored, and no decision flows backwards from the result. In Meridian every tuning decision and the threshold rule were settled on the validation window, which is the window that is allowed to receive feedback. And the rule covers more than hyperparameters: quietly choosing which of two runs to ship because one scored better on test is the same violation in a friendlier costume.`,
    challenge: {
      prompt: '"You evaluated on test, saw the numbers, and wrote a report recommending calibration and a fairness gate as next steps. That is feedback. Did you just contaminate your own holdout?"',
      answer: `That is the sharpest version of the question and the honest answer has a boundary in it. Reading the test card and concluding that calibration and a fairness gate are worth building does not contaminate anything by itself — no model, preprocessor or threshold changed, and the reported numbers still describe the frozen champion exactly as evaluated. What would contaminate it is the next step: if I build that calibrator or that gate, tune it, and then report its quality on the same test window, the window has now informed both the decision to build it and the evidence that it works. So the discipline is that the current card stands as the final word on this champion, and anything motivated by it gets evaluated on a fresh holdout — in this project, a later time window, which the panel conveniently keeps producing. If I could not get a fresh window, I would say the new number is optimistic rather than pretend it is not.`,
    },
  },
  {
    id: 'v-rag-chunking',
    moduleId: 'rag',
    prompt: 'Why did returning three chunks in the original RAG design still produce poor retrieval precision?',
    rubric: [
      `Chunking was too coarse: split on # and ## only → ~${RAG_CHUNKING.beforeChunks} chapter-sized chunks up to ~${RAG_CHUNKING.beforeMaxChars.toLocaleString()} chars`,
      `top_k=${RAG_CHUNKING.topK} then covered ~${Math.round(RAG_CHUNKING.beforeCoverage * 100)}% of the whole report`,
      'Context dilution: the answer was buried in mostly irrelevant text',
      'The embeddings, similarity maths and top_k were never the problem',
      `Fix: split on H1–H6 + paragraph pack ≤${RAG_CHUNKING.afterMaxChars} chars → ${RAG_CHUNKING.afterChunks} chunks, ~${(RAG_CHUNKING.afterCoverage * 100).toFixed(1)}% coverage`,
      'Cache schema_version bumped so stale indexes are rejected rather than silently reused',
      'Lesson: chunk semantics set the floor on retrieval precision',
    ],
    modelAnswer: `Because top_k counts chunks, not information, and our chunks were chapters. The first chunker split the Official report on # and ## only, producing about ${RAG_CHUNKING.beforeChunks} chunks with the largest near ${RAG_CHUNKING.beforeMaxChars.toLocaleString()} characters. Asking for the top ${RAG_CHUNKING.topK} therefore handed the model roughly ${Math.round(RAG_CHUNKING.beforeCoverage * 100)}% of the entire document. It showed up in the demo as an expander that looked like someone had pasted a chapter, and the answers were vague because the relevant sentence was diluted in pages of surrounding text. Nothing was wrong with the embeddings, the cosine maths or the value of top_k — retrieval was doing its job perfectly over units too coarse to be evidence. A chunk is the smallest thing retrieval can choose, so chunk boundaries set the floor on how precise an answer can be. The fix was structural: split on # through ###### so every heading level starts a chunk, then pack paragraphs up to ${RAG_CHUNKING.afterMaxChars} characters. That gave ${RAG_CHUNKING.afterChunks} chunks and took the same top-${RAG_CHUNKING.topK} query down to about ${(RAG_CHUNKING.afterCoverage * 100).toFixed(1)}% coverage. We also bumped the cache schema_version, because otherwise a stale on-disk index keeps serving the old chunk shapes when the source file has not changed.`,
    challenge: {
      prompt: `"You found that from a demo looking wrong, not from a measurement. What retrieval metric would have caught it, and why do you still not have one?"`,
      answer: `Correct — it was caught by eye, and the probe I used afterwards (coverage of the report at top-k for a known query) is a diagnostic I wrote to confirm a bug, not a retrieval metric. What would have caught it properly is a small labelled set: a handful of methodology questions with the chunk that actually answers each one, scored for context precision and recall, plus a faithfulness check that the answer is derived from the retrieved chunks. That is RAGAS-shaped evaluation and it is explicitly not shipped — ${RAG_015.stillOpen}. The reason is scope rather than principle: building the labelled set is the expensive part on a single-document corpus, and Sprint 5 had one report and a deadline. I would not claim measured retrieval quality anywhere, and the roadmap lists it as Phase 6 work alongside a real cross-encoder reranker.`,
    },
  },
  {
    id: 'v-deploy',
    moduleId: 'deploy',
    prompt: 'Is this in production? What exactly is deployed?',
    rubric: [
      'Docker/compose package FastAPI only',
      'ACA demo deployed and verified on 2026-09-24, then torn down; no standing URL',
      'Azure calls require valid credentials; earlier live evidence does not guarantee current availability',
      'maxReplicas: 1 because of SQLite (ADR 008)',
      'No CI for the Python tests (only the teaching app has a workflow)',
    ],
    modelAnswer:
      'It is a proof of concept, with a verified deployment rather than a standing production service. Docker and compose package FastAPI only. The ACA demo was deployed and verified on 2026-09-24, then torn down, so there is no standing URL. The later API-key gate still needs live verification. Azure calls require valid credentials; historical successful calls do not prove current availability. SQLite limits us to one replica to avoid split-brain; scaling out needs Postgres. CI covers the teaching app only; Python tests run by hand.',
    challenge: {
      prompt: '"Then in six months you have a model nobody uses and no pipeline. What would you have cut to get it deployed?"',
      answer: 'Deployment was demonstrated: the single-replica ACA demo was verified and torn down. The next steps depend on the operational goal. First verify the later API-key gate on a redeploy and add Python CI; replace demo roles with real identity before production use. Move the state store to Postgres before scaling beyond one replica. Keep the Friction-Gate and human approval controls throughout. A demo deployment and a production service have different acceptance criteria.',
    },
  },
];

export function vivaFor(moduleId: ModuleId): VivaPrompt[] {
  return VIVA.filter((v) => v.moduleId === moduleId);
}

/** How many prompts must be cleared before the Mastery gate opens. */
export const VIVA_REQUIRED = Math.ceil(VIVA.length * 0.6);

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** What `vivaCleared` needs from a stored prompt. */
export interface VivaProgress {
  draft: string;
  checked: number[];
  scoredAt?: number;
  grade?: GradeResult;
  revision?: number;
  gradedRevision?: number;
  rubricSignature?: string;
}

/**
 * A prompt is cleared only when the marker marked it and enough rubric points
 * were genuinely made (ADR-EDU-003). Self-ticking does not clear a prompt: the
 * rubric is on screen while you tick it, so it measures generosity as much as
 * recall. The self-grade checklist survives as an offline fallback and is
 * labelled as not counting.
 *
 * The question/rubric signature also invalidates a mark after teaching copy changes.
 */
export function vivaCleared(v: VivaPrompt, state?: VivaProgress): boolean {
  return Boolean(vivaGradeCurrent(v, state) && state?.grade?.available && state.grade.cleared);
}

export function vivaGradeCurrent(v: VivaPrompt, state?: VivaProgress): boolean {
  return Boolean(state?.grade && state.gradedRevision === (state.revision ?? 0) && state.rubricSignature === vivaSignature(v));
}

/** True when an answer was submitted but the marker could not be reached. */
export function vivaUnmarked(state?: VivaProgress): boolean {
  return Boolean(state?.grade && !state.grade.available);
}

export function vivaClearedCount(viva: Record<string, VivaProgress>): number {
  return VIVA.filter((v) => vivaCleared(v, viva[v.id])).length;
}
