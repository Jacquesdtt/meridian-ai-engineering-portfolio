# ADR 002: Enforcing Deterministic I/O via Pydantic

## Status
Accepted

## Context
Generative AI outputs (specifically from LLMs like Azure OpenAI) are inherently probabilistic. In a banking context, relying on regex parsing or raw JSON extraction from an LLM response is extremely brittle and poses a severe risk of pipeline failure if the LLM hallucinates keys or alters the schema structure. Furthermore, the MLOps inference engine (XGBoost) requires strictly typed features to predict churn accurately.

## Decision
We will use **Pydantic v2** as the mandatory data validation and serialization layer across the entire architecture.
1.  **Configuration:** `pydantic-settings` is used to load and validate all environment variables at startup (`src/core/config.py`).
2.  **API Boundaries:** All FastAPI endpoints must accept and return Pydantic `BaseModel` classes.
3.  **GenAI Structured Outputs:** Azure calls request `response_format={"type": "json_object"}`, then we **parse JSON and validate** with Pydantic (`RetentionDraftBody`) — rejecting out-of-bounds fields and numeric percentage claims above the validated offer (e.g. interest rate ≤ 3.5%). We do **not** currently pass a JSON Schema into the provider `response_format` (provider support varies on the enterprise gateway). Runtime enforcement is post-hoc Pydantic, not provider-side schema locking.

## Alternatives Considered
1.  **Standard Python Dictionaries / TypedDicts:** Rejected. They lack runtime validation and automatic coercion.
2.  **Marshmallow:** Rejected. Slower performance than Pydantic v2 (which uses a Rust core) and lacks seamless FastAPI integration.

## Consequences
*   **Pros:** Runtime validation at declared schema boundaries. Automatic HTTP 422 errors for invalid API requests. JSON still needs parsing, and schema-valid prose can contain unsupported claims.
*   **Cons:** Requires up-front investment in writing schema classes before building features.

## Trade-offs
We are trading initial development speed (writing verbose schemas) for long-term pipeline stability and compliance.
