# ADR-EDU-001: Static Teaching SPA (No Live LLM)

## Status

Accepted (2026-07-20). **Amended 2026-09-23 by [ADR-EDU-003](ADR-EDU-003-llm-marked-viva.md)**, which carves
out one exception: Explain-it answers are marked by Meridian's own FastAPI service. The SPA still ships with no
secret and still never calls a cloud LLM itself; everything else below stands.

## Context

The educational web app was scaffolded from Google AI Studio with a Gemini dependency. The Meridian project itself uses Azure OpenAI for GenAI extensions, under AppLocker and ZDR constraints. Wiring a second LLM provider into a teaching site would:

- Invent a non-Meridian integration path
- Require secrets for learners who only need concepts
- Drift from the “Friction as a Feature / no autonomous send” story

## Decision

Ship the educational app as a **fully static Vite + React SPA**:

- No Gemini, no Azure OpenAI calls from this app (ADR-EDU-003: Explain-it marking posts to Meridian's FastAPI,
  which holds the key — the browser still has none)
- GenAI / RAG lessons are **client-side simulations** with accurate copy
- Learners run the real Streamlit/FastAPI stack in the main repo when they want live Azure

## Alternatives considered

1. **Optional Gemini tutor** — rejected; wrong cloud story for Meridian  
2. **Proxy to Azure OpenAI** — rejected for teaching scope; secrets + TPM complexity  
3. **Embed Streamlit iframe** — rejected; coupling and AppLocker/localhost friction

## Consequences

- Content accuracy is owned by `FACT_SHEET.md` / `src/content/*`  
- Mastery interactions never depend on network LLM availability  
- README must not mention Gemini or AI Studio secrets
