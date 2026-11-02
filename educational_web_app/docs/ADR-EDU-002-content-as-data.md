# ADR-EDU-002: Content-as-Data

## Status

Accepted (2026-07-20)

## Context

The AI Studio scaffold put ~3k lines of UI and invented Meridian facts in a single `App.tsx`. Fixing one metric required hunting prose across interactive widgets.

## Decision

Separate **facts** from **presentation**:

```
src/content/facts.ts    # locked numbers, personas, anti-claims
src/content/generated/model_facts.json  # model numbers exported from Models/ops/ by scripts/export_teaching_data.py (npm run facts:check)
src/content/lessons.ts  # per-module objectives, primers, predict-then-reveal, takeaways
src/content/glossary.ts # glossary terms
src/content/questions.ts # module-check + review question bank
src/content/viva.ts     # explain-it prompts, rubrics, model answers
src/content/nextSteps.ts # future work only (Corrections Part B11/C)
src/content/modules.ts  # module metadata / order
src/content/tree.ts     # real repo tree + philosophies
src/content/quiz.ts     # mastery questions
src/modules/*.tsx       # interactive UI that imports content
```

Accuracy fixes prefer editing content modules (or `docs/FACT_SHEET.md`) over rewriting JSX.

## Consequences

- UI components stay thinner and reusable  
- Facilitators can audit numbers in one place  
- Module components may still hold interaction state; they must not hardcode competing metrics

## Mastery rigor (amendment 2026-07-20)

Interaction gates are **exposure checks** (some require wrong-path then correct-path). The mastery quiz embeds
`correctIndex` in the client bundle — it is an honor-system self-check, **not** a proctored certification.
Facilitators must disclose this limitation (see `WALKTHROUGH.md`).
