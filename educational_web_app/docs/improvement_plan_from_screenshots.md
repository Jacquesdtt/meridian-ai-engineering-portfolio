# Improvement Plan — Educational Web App (from screenshot review)

| Field | Value |
|-------|-------|
| **Date** | 2026-07-20 |
| **Scope** | `educational_web_app/` teaching SPA only |
| **Inputs** | 7 screenshots (02 Repo, 03 Working, 04 Data, 07 Friction, 08 GenAI, 09 RAG, 11 Deploy) + `revision_checklist.md`, `WALKTHROUGH.md`, `FACT_SHEET.md`, `App.tsx`, module source |
| **Discipline** | Planning artifact only — no code changes made. Follow `/docs-before-code` before implementing (attack note → signed checklist → code) if the user approves a wave. |
| **Gate** | Do **not** cascade into `Docs/Architecture/ADRs/` or edit `.cursor/plans/educational_app_rewrite_1bfbb583.plan.md`. |

> This plan is additive to `revision_checklist.md` (RT-01…RT-19, all resolved or deferred). New items below use an `IP-` prefix so they don't collide with RT numbering; fold into the checklist as `RT-20+` only once approved.

---

## 1. Themes from the screenshots

| Theme | Evidence |
|-------|----------|
| **Layout / double-scroll** | 02 Repo's workspace-explorer tree is a fixed `max-h-[520px]` panel with its *own* scrollbar nested inside the page's scroll container — the tree cuts off after ~4 items (`StartingFiles/` barely visible) while the sibling description panel has room to spare. 04 Data's resizable bottom panel (already added) still opens at a default `140px` — the single-line teaching comment plus the drag handle leaves almost no breathing room, and the code line reads as clipped in the screenshot. |
| **Discoverability** | The `ResizableBottomPanel` drag handle is a 12px-tall bar with only an `aria-label` — nothing visually invites a drag on first view. The 12 mastery gates are only enumerable from inside `MasteryModule`; the header's `Mastery 4/12` counter has no popover/drawer to see *which* 4. |
| **Fidelity vs. UI polish gap** | Content accuracy is now strong (RT-03/04/09/14/16 closed the numeric gaps). Remaining fidelity friction is cosmetic/interaction, not factual: Deploy's step-1 screen shows **two** different "run the bypass" affordances (the inline terminal button and the bottom `Next → Apply AppLocker bypass` button) doing the same thing, which reads as a bug to a first-time viewer even though it's intentional scaffolding. |
| **Mastery-gate legibility** | Friction and RAG both implement strong two-step gates (deny-then-approve; Chroma-block-then-packed) with good inline status text (`Need a non-approver deny first`, `Chroma block pending`). Deploy is the only module with a visual **stepper**. The other gated modules would benefit from the same visual language for consistency — right now gate progress is communicated in prose only. |
| **Visual density inconsistency** | 02 Repo's tree panel is cramped/dense; its sibling detail panel and the ADR-drawer chips below are comparatively spacious. 04 Data's line chart (`h-48`, no axis units) is small and sparse next to the denser cell-order list beside it. |

---

## 2. Already fixed this session (context, not re-planned)

| Module | Fix | Source |
|--------|-----|--------|
| 02 Repo | Clickable ADR chips + tree ADR files render full bundled markdown; accurate `TREE_DATA` (RT-19, RT-13) | `ArchitectureModule.tsx`, `content/adrs.ts`, `content/tree.ts` |
| 03 Working | Real flowcharts with clickable hotspots + gate (`FlowchartExplorer`, `completedWorkflow`) | `WorkflowsModule.tsx` |
| 04 Data | `ResizableBottomPanel` shared component (drag-to-resize teaching notes) | `components/shared/ui.tsx` |
| 07 Friction | Scroll fix for the previously cropped Approve/Reject draft card | `FrictionModule.tsx` |
| 09 RAG | "With vs without Chroma" side-by-side sub-tab alongside the Exposure-check gate tab | `RagModule.tsx` |
| 11 Deploy | Stuck-nav fix — `Next` correctly gates on `ignoreData`/`testOk`, back-nav via step circles works | `DeployModule.tsx` |

Verified against current source during this review — code matches the "already fixed" claims. **Recommend one quick manual click-through of the `WALKTHROUGH.md` quick path** before starting new work, since two of the screenshots (07 Friction, 11 Deploy) still visually match the *pre-fix* state — they may have been captured before the fix landed. Do not treat this plan's findings for those two modules as new bugs.

---

## 3. Recommended improvements (sequenced waves)

### Wave 1 — P0, residual layout/scroll polish (all Small, no gate-logic changes)

> **Status (2026-07-20):** IP-01 / IP-02 / IP-03 **implemented**. Lint/build verification in same session.

| ID | Problem (screenshot / module) | Proposed change | Effort | Priority | Risk to FACT_SHEET / gates / ADR-EDU | Status |
|----|-------------------------------|------------------|--------|----------|----------------------------------------|--------|
| **IP-01** | 02 Repo — nested tree scrollbar (`max-h-[520px] overflow-y-auto`) truncates the tree well before the sibling panel's content ends, creating an awkward double-scroll (page + tree) | Either (a) drop the tree's own `max-h`/`overflow-y-auto` and let it grow with the page scroll like the rest of the module, or (b) raise `max-h` to match the detail panel's rendered height dynamically (`min-h-[420px]` parity) and add a subtle bottom-fade/"more below" affordance | S | P0 | None — pure layout/CSS; no `facts.ts`/ADR content touched | `[x]` option (a) |
| **IP-02** | 04 Data — `ResizableBottomPanel` default height (140px) barely fits the 3-line teaching comment plus the drag handle; reads as clipped | Bump `defaultHeight` for this instance to ~180–200px (prop already supports per-instance override) and keep `minHeight` as-is so the collapse option remains | S | P0 | None — visual-only prop change | `[x]` `defaultHeight={190}` |
| **IP-03** | 11 Deploy — step 1 shows two separate "apply bypass" buttons (inline terminal button + bottom `Next`) doing the same action, reading as redundant/confusing | Keep exactly one primary CTA per step: make the inline terminal button the only trigger for `applyBypass()`, and change the bottom button to a disabled "Waiting for tests…" state until `testOk` is true, then it becomes `Next` | S | P0 | None — same `honestDeploy` interaction path, gate unaffected; pure CTA relabeling | `[x]` |

### Wave 2 — P1, discoverability

| ID | Problem (screenshot / module) | Proposed change | Effort | Priority | Risk |
|----|-------------------------------|------------------|--------|----------|------|
| **IP-04** | Header shows `Mastery X/12` with no way to see *which* gates remain without opening 12 Mastery | Add a small popover/drawer on the header's mastery counter listing the 12 gate names + done/not-done + a "Go to module" link, sourced from the existing gate table already in `MasteryModule`/`WALKTHROUGH.md` (no new copy invented) | M | P1 | Low — must reuse existing gate id → label mapping verbatim; do not add or rename gates (would violate mastery-rigor disclosure in RT-05) |
| **IP-05** | `ResizableBottomPanel` drag handle (04 Data) is easy to miss — only an `aria-label`, no persistent visual hint | Add a small always-visible text hint next to the grip icon (e.g. "Drag ⇕ to resize") instead of only exposing it via `aria-label`; optionally a one-time subtle pulse on first module visit | S | P1 | None — visual affordance only |
| **IP-06** | 09 RAG Exposure-check tab: the two-step gate (Chroma-block → packed retrieve) is explained in a `Callout` but has no persistent visual progress indicator like Deploy's stepper | Add a compact 2-node mini-stepper ("1. Chroma blocked → 2. Packed retrieve") above the controls, driven by existing `sawChromaBlock`/`chunkMode` state — no new state, no logic change | M | P1 | Low — additive UI only; must not alter `completedRagPath` trigger conditions (RT-12) |

### Wave 3 — P1/P2, cross-module consistency

| ID | Problem | Proposed change | Effort | Priority | Risk |
|----|---------|------------------|--------|----------|------|
| **IP-07** | Gate progress language/visuals differ across Friction (prose), RAG (prose + IP-06 mini-stepper), and Deploy (full stepper) | Extract Deploy's stepper into a shared `GateStepper` component and apply a slim variant to Friction (deny→approve) for visual parity across the three gated modules | M | P2 | Medium-low — touches red-teamed interaction modules; treat as UI-only refactor and re-verify RT-06/RT-11/RT-12 click-paths still fire `setInteraction(...)` identically. Recommend a short attack-note addendum before implementing (per `docs-before-code`) since it modifies gated-module JSX, even though logic is unchanged |
| **IP-08** | 04 Data leakage-simulator chart is small (`h-48`) with no axis units, feels sparse next to the denser cell-order card | Increase to `h-56`/`h-64`, add a "$" prefix/₮ unit label on the Y-axis, keep data unchanged | S | P2 | None — chart is decorative/illustrative, no numeric claim changes |
| **IP-09** | 09 RAG Exposure tab: disabled-looking buttons ("Packed ≤1200 chars" while gated, "Chroma block pending" text) are visually similar to normal-unselected buttons — hard to tell what's clickable vs. informational | Add explicit `disabled`/`opacity-50 cursor-not-allowed` styling only where a control is truly non-interactive (the "Chroma block pending" text is a status label, not a button — clarify with distinct typography vs. the two real toggle buttons) | S | P2 | None — visual clarity only |

### Wave 4 — P2/P3, deferred / stretch (do not start without explicit re-approval)

| ID | Problem | Proposed change | Effort | Priority | Risk |
|----|---------|------------------|--------|----------|------|
| **IP-10** | RT-17 (deferred): Data module's "Notebook cell order" is 3 click-to-execute buttons in a fixed visual order, not a true drag-reorder — the "wrong order" has to be a *deliberate* out-of-sequence click rather than a moved cell | Optional: convert to drag-and-drop reorderable list so mis-ordering is a natural action, not a deliberate one | M/L | P2 (stretch) | Low if scoped as pure interaction change; keep `simulatedLeakage` trigger condition semantically equivalent. **Stays deferred per signed `revision_checklist.md` unless the user explicitly re-opens RT-17.** |
| **IP-11** | Sidebar (12 modules) has no scroll-shadow/affordance if the nav list overflows a short viewport | Add a subtle top/bottom fade or scroll-indicator to `Sidebar.tsx`'s `nav` list | S | P3 | None |

---

## 4. Out of scope (this pass)

- **No live LLM / no reintroducing Gemini or a live Azure call into the teaching SPA** — GenAI and RAG modules stay fully simulated/offline (ADR-EDU-001, G-EDU-001 stays locked).
- **No edits to `Docs/Architecture/ADRs/*`** (main repo) unless the user explicitly asks — this plan is UI/interaction polish only.
- **No PresenterView work** — out of scope for the educational SPA.
- **RT-17** (Data cell-order redesign) and **RT-18** (code-split/bundle/package rename) remain **deferred** per the signed `revision_checklist.md`; IP-10 above is listed only as an optional stretch, not a default-approved item.
- **No changes to `facts.ts` / `FACT_SHEET.md` locked numbers** — every item in Waves 1–4 is layout/interaction/affordance only; none require a `G-FACT` unlock.
- **No edits to `.cursor/plans/educational_app_rewrite_1bfbb583.plan.md`**.
- **No Streamlit/FastAPI/production behavior changes** — this plan touches `educational_web_app/` exclusively.

---

## 5. Suggested Definition of Done (next polish pass)

- [ ] Each implemented item has a **before/after screenshot pair** attached to the PR/commit description.
- [x] `npm run lint` (`tsc --noEmit`) and `npm run build` both pass clean in `educational_web_app/` *(Wave 1 — verify in same session)*.
- [ ] Manual click-through of the `WALKTHROUGH.md` **quick path** (Problem → Repo → Working → Model → Friction → RAG → Deploy → Mastery) confirms all **12 mastery gates still fire identically** — no gate id, label, or trigger condition changed as a side effect of visual work.
- [x] No diffs in `src/content/facts.ts` or `Docs/Data/Data_Dictionary.md`-sourced numbers unless a `G-FACT` item was explicitly approved with evidence (none are in this plan).
- [x] `revision_checklist.md` updated with the approved `IP-` items (IP-01…IP-03 marked `[x]`; Waves 2–4 still open).
- [x] `WALKTHROUGH.md` updated only if any gate **copy** (not logic) changed as part of IP-06/IP-07. *(Wave 1: no gate-copy change — skip.)*
- [x] Any change touching a red-teamed gated module (Friction, RAG, Deploy — IP-03, IP-06, IP-07) gets a one-paragraph addendum in `docs/red_team_attack_note.md` or a note in the PR confirming the gate condition is unchanged, per `/docs-before-code`. *(IP-03 addendum added.)*
- [x] No new files under `Docs/Architecture/ADRs/`; no edits to the rewrite plan file.

---

## Appendix — MCP plan tool check

The `user-plan` MCP server (which would host a `CreatePlan`-style tool) returned a connection error during this session (`serverStatus: "error"`) and exposed no usable tools beyond `mcp_auth`. No Cursor plan object could be created via MCP; this markdown file is the sole plan artifact for this task, per the fallback instruction.
