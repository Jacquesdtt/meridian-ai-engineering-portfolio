# Educational app revision evidence — 2026-09-23

Implementation baseline: current working tree, including unrelated uncommitted changes. The user explicitly instructed implementation of `improvement_plan_2026-09-23.md`.

| Severity | Finding and evidence | What would falsify it | Checklist item |
|---|---|---|---|
| High | `PracticeModule.tsx` calls `saveViva` with a new draft but retains `grade`; `vivaCleared` trusts `grade.cleared`. The pending request also has no revision check. | A test showing a changed answer or late result cannot keep a pass. | EDU-01 implement |
| High | `AppProgress.tsx` drops non-v4 state and ignores localStorage write errors; `Header.tsx` resets without confirmation. | A migration/recovery path and reset guard in the running UI. | EDU-02 implement |
| Medium | Header counts interaction flags as “Mastery”; Sidebar and Mastery apply stricter conditions. | One shared, consistently labelled progress calculation. | EDU-03 implement |
| Medium | The `/health` probe says nothing about Azure marker readiness; header says “offline” while Explain-it requires the API. | A marker-specific readiness state and clear user messaging. | EDU-04 investigate/implement |
| Medium | Tablist has no keyboard behavior or panel association; resize separator handles pointer events only. | Keyboard and browser verification. | EDU-05 implement |
| Low | Earlier IP-04–07 ideas may be stale after subsequent revisions. | Current module walkthrough shows their proposed cues already present. | EDU-07 investigate |

No locked metric, churn definition, role rule, or human approval decision is reopened by these changes. The earlier RT-17/RT-18 deferrals remain in force. The local plan is the dated revision checklist and defines acceptance criteria for EDU-01–09. The user’s “proceed with the plan” is sign-off for its implementation items.

## Verification and closure (2026-09-23)

Implementation and local verification completed, with external usability assessment still open:
- **EDU-01**: Verified via `progressState.test.ts` and `AppProgress.test.tsx` that changing drafts increments revision, clears previous grades, and rejects late/stale marking.
- **EDU-02**: Verified that v4 and legacy saved drafts recover into v5 without carrying over invalid mastery flags, storage write errors raise UI alerts, and reset requires explicit confirmation.
- **EDU-03**: Verified unified selectors (`progressSelectors.ts`) across Header, Sidebar, Progress Drawer, and Mastery.
- **EDU-04**: Verified `/health` exposes `azure_configured`, marker probe distinguishes configured/unconfigured/unreachable, and UI preserves drafts with retry.
- **EDU-05**: Verified keyboard navigation across lesson tabs (`ArrowLeft`/`ArrowRight`), `ResizableBottomPanel` (`ArrowUp`/`ArrowDown`), and `Escape` key dismissal for both Progress and Glossary drawers.
- **EDU-06**: Verified tab restoration via `lastTabs` and next-step guidance card after module checks.
- **EDU-07**: Verified `GatePath` prerequisite cues in Friction and RAG modules.
- **EDU-08**: The frontend suite passed 21 Vitest tests on 2026-09-23; backend code was unchanged in this pass.
- **EDU-09**: The 2026-09-23 15:53 local production build emitted one 984.55 kB JavaScript chunk (302.39 kB gzip). This is a bundle snapshot, not a measured startup time. RT-18 code splitting remains deferred.

The planned 3–5 learner usability trial has not been run; no learner outcome or retention improvement is claimed.
