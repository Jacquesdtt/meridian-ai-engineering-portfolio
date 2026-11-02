# Follow-up to Jamie (Arvind) — Outstanding Risk Questions

**Date drafted:** 2026-07-16  
**After:** Sprint 5 Risk meeting (notes in [04_jamie_sprint5_risk_prep.md](04_jamie_sprint5_risk_prep.md))  
**Maps to:** JR-OPEN-01…05 in [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md)  
**Status:** Draft ready to send — update register §C when Arvind replies  

**Note (2026-07-16 evening):** We also shipped **JR-REQ-19** anti rubber-stamp (attention ack on Approve). Optional one-liner you can add to the message: *“We’ve also made Approves require an explicit attention check so HITL doesn’t become click-through.”*

---

## Message (Teams / email)

Hi Arvind,

Thanks again for the time earlier — and for being clear that fairness / showing how we avoid unfair treatment of customers needs to be front and centre in the final presentation and report. I’ve written that up so assessors can see what we measured, how we limited who gets contacted, and that a human still has to approve anything before it could go out.

Quick context if it’s useful: we’ve built a small “Friction-Gate” review tool. The model ranks who’s most at risk of closing their account; for the highest-risk slice it can draft a retention email; **the AI never sends email**. Someone has to review and approve, and “approve” only means “ready for a person to send outside this system.” We also scrub personal details before anything would go to a language model, and we hard-cap any interest rate mentioned in a draft at 3.5%.

To finish the Risk side cleanly, I need your steer on a few things we left open. No need for long answers — a short preference on each is enough:

1. **Fairness going forward**  
   We’ve measured differences in how the model treats age groups and states (at the same contact threshold we’d actually use). Gaps aren’t zero, and we’ve documented them.  
   **Do you want a hard rule** (e.g. “don’t release if the gap is above X”), **or is periodic review + disclosure enough** for now?

2. **What we should check for unfairness**  
   Right now we look at **age** and **state** (that’s what we have in the data).  
   **Is that enough for your purposes**, or are there other customer attributes Risk would expect us to check?

3. **Sending email later**  
   Today, approving a draft does **not** send anything.  
   If Meridian ever plugs this into a real mailer, **is one human approval enough**, or would you want a **second approval** at send time?

4. **Audit log for a future production version**  
   We already log who (by demo role) created/edited/approved/rejected a draft.  
   **Anything else you’d insist on** for a real system (e.g. lasting staff ID, how long to keep logs, a fingerprint of what was sent to the AI)?

5. **Login / access control**  
   The demo uses a simple role dropdown (agent vs compliance viewer) — it’s for the assessor story, **not** real bank SSO.  
   **Is that fine for this project milestone**, and roughly **when would Risk expect proper Entra/SSO** if this went further?

Happy to jump on a short call if easier than typing. Once I have your answers I’ll lock them into our Risk requirements note and the final deck/report.

Thanks,  
Jacques

---

## When he replies — cascade checklist

- [ ] Update [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md) §C (JR-OPEN → answered)
- [ ] Update [04_jamie_sprint5_risk_prep.md](04_jamie_sprint5_risk_prep.md) §§6–9
- [ ] Update [stakeholder_engagement_plan.md](../stakeholder_engagement_plan.md) Jamie status
- [ ] Reflect any hard gates in the live deck ([Docs/Presentations/](../../Presentations/generate_presentation.py)) / [final_report.md](../../Sprint4/final_report.md) if policy changes (legacy Marp: [Sprint4/presentation.md](../../Sprint4/presentation.md))
- [ ] Update `.agents/MEMORY.md`
