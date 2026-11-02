# Sprint 0: AI Business Partner Learnings

- **ROI Discovery (The 6-Factor Filter):** Learned to validate the technical feasibility of an AI project against its actual business value. Shifted the core metric from "model accuracy" to "AUM (Assets Under Management) saved" by identifying churning accounts.
- **Stakeholder Mapping (CATWOE & POPIT):** Identified Sam (Head of Data Science) as the Champion who needs to see ML rigor, Jamie (Risk) as the Blocker who needs to see compliance features (ZDR, Friction), and Morgan (Product) as the budget holder who demands ROI.
- **Friction as a Feature:** Designed the architecture to intentionally slow down the AI. By placing the LLM output (retention emails) behind a "Pending Review" human gate, we solved the business risk of autonomous hallucinations communicating with high-value retail banking clients.
