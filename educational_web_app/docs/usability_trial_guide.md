# Educational app learner trial

Status refreshed 2026-10-20: **learner trial still open**. The user confirmed no participants are available and requested completion of technical validation while leaving this trial open. Browser checks and a local performance baseline are recorded in [validation_2026-10-20.md](validation_2026-10-20.md); those checks do not substitute for participant observations.

Use 3–5 learners unfamiliar with the app. Give each person a fresh browser profile or a validated empty progress export. Observe without coaching. Record task success, time, and where they hesitate; do not collect names or copy their written Explain-it answers into the notes.

| Task | Ask the learner to do | Success signal |
|---|---|---|
| Start | Open lesson 01, make a prediction, explore the demo, and find its recall check. | Finds the Learn → Explore → Check path unaided. |
| Resume | Leave for another module, return to lesson 01, and continue. | Returns to the previously selected lesson step. |
| Progress | Explain what the header count represents and what remains before the final quiz. | Distinguishes exploration, predictions, recall checks, and marked explanations. |
| Offline marking | Open Practice → Explain it while the API is unavailable. | Understands that the answer is saved, self-check is available, and no Mastery credit is awarded. |
| Recovery | Find progress export and the reset action without deleting work. | Finds both, understands that reset requires confirmation, and can cancel. |

For each participant, record `P1`…`P5`, viewport width, task result (`pass`, `needed hint`, `blocked`), approximate completion time, and one observed point of confusion. The proposed success target is at least 4 of 5 people identifying their next action and remaining Mastery requirements unaided. Treat it as a trial target, not a claimed outcome.

For repeat performance measurements, build the app and run `node scripts/validation-preview.mjs` from `educational_web_app`. Open the printed isolated loopback origin. The QA-only panel measures navigation-start to the first lesson with controls after two animation frames, and navigation-button clicks to two animation frames. Responses use `Cache-Control: no-store`. Record the visible destination as well as the timer. The harness does not alter production build files or learner state. Start each reload sample from lesson 01; a restored Practice screen is not a lesson startup sample. Record device, viewport, browser, network and three Practice transitions. Compare after future changes; bundle size alone is not a startup measurement.

## Participant record (unfilled)

Copy one row per participant/task. Use P1–P5 only. Do not record names or written answers.

| Participant | Viewport | Task | Result: pass / hint / blocked | Time | Observed confusion |
|---|---|---|---|---|---|
| Not yet recruited | — | — | Not observed | — | — |

Report the actual denominator: with 3–4 participants, record n/N and leave the proposed 4-of-5 target unassessed until five have participated.
