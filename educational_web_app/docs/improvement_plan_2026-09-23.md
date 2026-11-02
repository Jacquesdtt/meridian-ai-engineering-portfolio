# Educational app improvement plan

Date: 2026-09-23; status refreshed 2026-10-20. Scope: React educational app. EDU-01–08 implemented and locally verified; EDU-09 local runtime baseline measured. Participant usability remains open (user confirmed no participants). Live marker revalidation returns Azure HTTP 401; the 2026-09-24 benchmark is historical evidence.

## Aim

Make Meridian easier to learn from, trustworthy about what the learner has achieved, and dependable enough to preserve their work. Keep the existing Learn → Explore → Check structure, spaced review, project evidence, and API-marked Explain-it practice. Improve those foundations before adding more modules.

The initial assessment used the uncommitted working tree. On 2026-09-23, the revised app passed TypeScript checking, 21 frontend tests, and a production build. Browser inspection covered the core lesson-to-practice path and viewport widths 360, 768, and 1440 px without page-level horizontal overflow. The 15:53 local build that day was 984.55 kB JavaScript (302.39 kB gzip); this is a historical snapshot. Live Azure grading and real learner outcomes were not verified.

**Current validation:** [2026-10-20 report](validation_2026-10-20.md) records release checks, browser checks and a measured local startup/navigation baseline. The 2026-09-24 bundle snapshot was 1,088.35 kB JavaScript (336.46 kB gzip). Bundle sizes and localhost timings do not establish performance on public networks or learner outcomes. RT-18 code splitting remains deferred.

## Findings and proposed response

| ID / priority | Evidence and user impact | Proposed change | Acceptance criteria |
|---|---|---|---|
| EDU-01 / P0 | `PracticeModule.tsx` saves edited answer text without invalidating the existing grade. `vivaCleared()` in `content/viva.ts` checks only the stored grade. A previously passed answer can remain passed after being changed; an in-flight response also has no answer-version check. | Associate each grade with the submitted answer revision and rubric version. Mark edited answers as needing re-marking; preserve the previous result as history if useful. Discard or label stale responses. | Passing an answer then replacing it does not leave the new answer cleared. Editing while marking, switching prompts, and out-of-order responses cannot credit the wrong answer. Offline self-review never grants a marked pass. |
| EDU-02 / P0 | `AppProgress.tsx` silently resets non-v4 saved state and silently ignores storage-write failures. `Header.tsx` calls reset directly. Written practice answers can be lost without useful warning. | Validate persisted state; migrate recoverable drafts without carrying forward invalid mastery credit. Add progress export/import, a storage-status message, and a confirmation explaining exactly what reset removes. Preserve recoverable data before schema changes. | Reload preserves answers. Malformed, old-version, and blocked-storage cases recover safely or explain the limitation. Canceling reset preserves everything. Export/import round-trips supported state; imports are validated before replacement. |
| EDU-03 / P1 | Header labels the count of interaction flags “Mastery”; sidebar additionally requires predictions and checks; Mastery has further viva and quiz requirements. Different surfaces answer “am I finished?” differently. | Separate “Exploration,” “Recall checks,” and “Explain-it” progress. Use shared selectors for all progress displays. Add a compact remaining-work drawer linking directly to unfinished work. | Identical saved state produces consistent labels across header, sidebar and Mastery. Completing demos alone never reads as full mastery. Requirements remain intact; policy changes require a separate decision. |
| EDU-04 / P1 | Header says “offline,” while ADR-EDU-003 and `vivaGrader.ts` require the API for marking. The readiness probe only checks HTTP success from `/health`; it does not establish marker availability. | Say “Lessons work offline; AI marking needs a connection.” Distinguish checking, ready, unavailable and marking states. Preserve drafts and provide explicit retry. Investigate a marker-specific readiness response if needed. | API-down, API-up/marker-unavailable, timeout, invalid response and recovery states are understandable and do not produce a false fail or pass. The user can keep studying while marking is unavailable. |
| EDU-05 / P1 | `App.tsx` renders ARIA tabs without corresponding panel wiring or arrow-key behavior. `ResizableBottomPanel` exposes a separator but only pointer resizing. | Complete keyboard interaction and focus behavior. Add a visible resize hint plus keyboard controls. Audit mobile navigation, glossary focus, contrast, zoom and reduced motion in a browser before fixing further issues. | Keyboard users can navigate lesson tabs, resize panels and leave overlays. Verify at 360, 768 and 1440 px and 200% zoom; no inaccessible primary controls or unexpected horizontal page overflow. |
| EDU-06 / P1 | Navigation returns to Learn or Explore based on whether a prediction exists; it does not restore the learner's last lesson tab. Existing progress supports more useful guidance than the shell currently exposes. | Add “Continue learning” and “Review due” entry points, remember the last lesson step, and show one clear next action after each check. Reuse existing review scheduling and question pools. | Returning users resume the correct module and step. An incorrect answer links to its relevant explanation. Due review is reachable in one action without forcing users away from their current lesson. |
| EDU-07 / P2 | Earlier IP-04–07 proposals cover progress discoverability, resize affordance and inconsistent simulation steps. The current app has evolved since that plan. | Reconcile those items with EDU-03/05; add a shared lightweight step indicator for Friction, RAG and Deploy only where it clarifies the next action. Use the current scenario states and copy. | Users can identify the next action and why it is blocked. Walkthrough confirms unchanged exposure-gate conditions. Do not implement old Chroma-specific copy without checking today's RAG module. |
| EDU-08 / P1 | `package.json` has type-check/build scripts but no frontend behavioral test script. Those checks cannot detect stale grades or destructive progress behavior. | Add focused state/component tests for EDU-01–04 and a small browser smoke suite for the core learning journey. Mock the marker for deterministic tests. | CI catches stale grade credit, accidental reset, failed persistence and broken progress requirements. Smoke path covers Learn → Explore → Check → Practice → Mastery plus unavailable marking. Live grading evaluation remains separate. |
| EDU-09 / investigate | `App.tsx` imports all modules eagerly; production build emits a chunk-size warning. Earlier RT-18 explicitly deferred code splitting. | Measure startup and module-switch responsiveness on a representative device. Record a baseline; propose lazy module loading only if measurement warrants reopening RT-18. | Record repeatable before/after transfer, startup and navigation measurements. No loading dead ends or lost state. Do not treat the size warning alone as proof of poor usability. |

Findings are falsifiable: EDU-01 would be disproved by existing answer-version enforcement on the actual save/clear path; EDU-02 by a recovery/reset guard outside the reviewed provider and header; EDU-03 by a shared completion definition already used throughout. Verify these paths again before implementation because the working tree is actively changing. Accessibility and performance findings require browser measurements to establish their full impact.

## Delivery sequence

Effort ranges are planning estimates for one developer, including focused verification; they are not commitments.

1. **Wave 1 — Protect work and assessment integrity (3–5 days).** EDU-01, EDU-02 and the corresponding EDU-08 tests. First reproduce the stale-grade and reset scenarios. Deliver answer-version-aware marking, safe progress recovery and guarded reset.
2. **Wave 2 — Make progress and service state clear (2–4 days).** EDU-03, EDU-04 and remaining state tests. Align progress labels and remaining-work links. Establish whether readiness can be fixed in the client or needs an explicitly scoped API change.
3. **Wave 3 — Improve learning flow and accessibility (3–5 days).** EDU-05, EDU-06 and EDU-07, followed by browser smoke coverage. Verify current walkthrough gates before and after changes; record screenshots at the target viewport sizes.
4. **Wave 4 — Measure and refine (1–2 days for assessment).** EDU-09 and a small usability trial. Observe 3–5 learners starting a lesson, resuming work, explaining remaining requirements and recovering from unavailable marking. Prioritize subsequent work from observed failures.

Suggested first implementation slice: reproduce stale-grade credit, bind a result to its submitted answer revision, and verify edit-during-marking behavior. This addresses correctness before cosmetic changes.

## Success measures

- No lost drafts in the supported reload, migration, reset-cancel and marker-failure scenarios.
- No mastery credit for an edited, unmarked answer or an obsolete grading response.
- All tested progress displays agree on completion requirements.
- In the small usability trial, at least 4 of 5 participants can identify their next action and explain what remains before mastery without assistance. This is a proposed target, not a measured result.
- All core tasks work using keyboard navigation; browser smoke tests and existing type/build checks pass.
- Track first-attempt recall separately from clicks and revisits. Do not claim improved retention without a later assessment.

## Boundaries and dependencies

- The user approved this plan for implementation; the dated attack note and revision checklist record the scope. Further changes to deferred RT-17/RT-18 still need a deliberate scope decision.
- Keep factual model metrics, churn definition, role rules and approval semantics unchanged. Preserve the self-study disclosure and the distinction between simulations and live services.
- ADR-EDU-003 already permits API-backed Explain-it marking. Do not revert it based on the older screenshot plan's fully-offline assumption.
- Do not weaken mastery requirements to make the progress indicator easier to complete. Keep exposure, recall and marked explanation distinct.
- Preserve earlier RT-17/RT-18 deferrals. Drag-and-drop notebook redesign and code splitting require a deliberate scope decision; EDU-09 authorizes investigation only when this plan is implemented.
- Do not rewrite the app, add another AI provider, expand the curriculum, or deploy it as part of this improvement pass.
- Preserve unrelated uncommitted work when making follow-up changes; this pass included implementation, tests, and documentation.

## Execution checklist

- [x] Review the proposed wave and its acceptance criteria before implementation.
- [x] Reproduce relevant findings against the current working tree.
- [x] Implement Wave 1 and focused regression tests (EDU-01, EDU-02, EDU-08).
- [x] Implement Wave 2 and verify progress/readiness states (EDU-03, EDU-04).
- [x] Implement Wave 3 and verify the walkthrough in a browser (EDU-05, EDU-06, EDU-07).
- [x] Record the production bundle and local startup/navigation baseline (EDU-09), completed 2026-10-20; method and limitations in the validation report. RT-18 code splitting remains deferred.
- [ ] Run the proposed 3–5 learner usability trial using the [trial guide](usability_trial_guide.md) when participants are available; the target above is unmeasured.
- [x] Record implementation and verification results in the walkthrough/revision documents.

Existing references: [screenshot improvement plan](improvement_plan_from_screenshots.md), [revision checklist](revision_checklist.md), [walkthrough](WALKTHROUGH.md), [learner trial guide](usability_trial_guide.md), [API-marked Explain-it decision](ADR-EDU-003-llm-marked-viva.md).
