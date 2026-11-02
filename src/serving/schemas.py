"""Pydantic I/O for score and draft APIs (ADR 002)."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Opaque actor reference only — never an email / free-text PII (Jamie RT-J2-05).
_REVIEW_KEY_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,64}$")
# Check explicit percentage claims in both generated text and human edits.
_PERCENT_RE = re.compile(
    r"(?<![\w.,])([+-]?(?:\d[\d.,\s]*|[.,]\d+)(?:[eE][+-]?\d+)?)"
    r"\s*(?:[%％]|per[\s-]*cent\b)",
    re.IGNORECASE,
)


def normalize_review_key(value: Optional[str]) -> Optional[str]:
    """Return None or an opaque review_key; raise ValueError if PII-like."""
    if value is None:
        return None
    key = value.strip()
    if key == "":
        return None
    if "@" in key or not _REVIEW_KEY_RE.fullmatch(key):
        raise ValueError(
            "review_key must be an opaque id (1–64 chars: A–Z a–z 0–9 _ . : -); "
            "emails / free-text PII are rejected"
        )
    return key


class DraftStatus(str, Enum):
    """Friction-Gate lifecycle. There is no ``sent`` — outbound is human-only."""

    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"


class CustomerFeatures(BaseModel):
    """Domain model for a customer's feature set.
    
    Explicitly types key drivers for the UI, while allowing arbitrary 
    additional features required by the XGBoost pipeline.
    """
    model_config = ConfigDict(extra="allow")

    start_balance: float = 0.0
    Monthly_Transaction_Count: int = 0
    age_years: int = 18
    Active_Txn_Lag1: float = 0.0


class FixtureData(BaseModel):
    """Pydantic model for loading Sprint 4 demo fixtures."""
    meta: dict[str, Any]
    features: CustomerFeatures


class ScoreRequest(BaseModel):
    """Raw feature row matching Sprint 1/2 ``training_data`` feature columns."""

    model_config = ConfigDict(extra="forbid")

    features: CustomerFeatures = Field(
        ...,
        description="Raw feature map (state + numerics). Must include all raw_feature_cols.",
    )
    review_key: Optional[str] = Field(
        default=None,
        description="Opaque agent-facing key (not sent to LLM).",
    )

    @field_validator("review_key")
    @classmethod
    def _opaque_review_key(cls, v: Optional[str]) -> Optional[str]:
        return normalize_review_key(v)


class ScoreResponse(BaseModel):
    """Result of ``POST /score``: probability, ops-cut flag, and model provenance."""

    churn_probability: float
    flagged: bool
    threshold: float
    threshold_rule: str
    run_id: str


class RetentionDraftBody(BaseModel):
    """Bounded GenAI (or stub) retention email — Jamie's rate cap lives here."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=4000)
    offered_interest_rate: float = Field(
        ...,
        ge=0.0,
        le=0.035,
        description="Hard cap 3.5% — Pydantic rejects hallucinations above this.",
    )
    drivers: list[str] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def _check_text_rates(self) -> RetentionDraftBody:
        """Reject numeric percentage claims above the validated offer.

        This conservative check also applies to edited drafts. Human review is
        still required for rates written in words and other unsupported claims.
        """
        for text in (self.subject, self.body):
            matches = list(_PERCENT_RE.finditer(text))
            markers = re.findall(r"[%％]|per[\s-]*cent\b", text, re.IGNORECASE)
            if len(matches) != len(markers):
                raise ValueError("Percentage claims must use unambiguous numeric values")
            for match in matches:
                number = match.group(1).strip()
                # A comma followed by three digits could mean a thousands group.
                # Reject it and spaced groups rather than silently reducing the offer.
                if re.search(r"\s", number) or re.fullmatch(
                    r"[+-]?\d{1,3},\d{3}(?:[eE][+-]?\d+)?", number
                ):
                    raise ValueError("Percentage claims must use unambiguous numeric values")
                rate = float(number.replace(",", ".")) / 100
                if rate < 0 or rate > self.offered_interest_rate + 1e-12:
                    raise ValueError(
                        "Percentage claims must be non-negative and no higher "
                        "than offered_interest_rate"
                    )
        return self


class DraftCreateRequest(ScoreRequest):
    """Create a draft: server always re-scores; client probability is ignored."""


class DraftRecord(BaseModel):
    """One Friction-Gate queue row (API + SQLite store share this shape)."""

    id: str
    status: DraftStatus
    churn_probability: float
    threshold: float
    run_id: str
    review_key: Optional[str] = None
    drafter_source: str
    draft: RetentionDraftBody
    created_at: datetime
    updated_at: datetime


class DraftPatchRequest(BaseModel):
    """Human edit / status change. Full draft re-validated when draft fields set.

    Approves require ``attention_ack=True`` (JR-REQ-19 / ADR 003 amendment) so
    Friction-Gate is not a one-click rubber stamp.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[DraftStatus] = None
    subject: Optional[str] = Field(default=None, min_length=1, max_length=120)
    body: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    offered_interest_rate: Optional[float] = Field(default=None, ge=0.0, le=0.035)
    attention_ack: Optional[bool] = Field(
        default=None,
        description="Required true when status=approved (anti rubber-stamp).",
    )
    seconds_open: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Client-measured seconds the draft was open; audit-only (fast-decide cue).",
    )

    @model_validator(mode="after")
    def _approve_requires_attention_ack(self) -> DraftPatchRequest:
        if self.status == DraftStatus.approved and self.attention_ack is not True:
            raise ValueError(
                "attention_ack must be true when approving "
                "(Friction-Gate anti rubber-stamp / JR-REQ-19)"
            )
        return self


class GlassBoxResponse(BaseModel):
    """``GET /model/glass-box``: frozen serving evidence for humans (no scoring)."""

    run_id: str
    threshold: float
    threshold_rule: str
    top_shap: dict[str, float] = Field(default_factory=dict)
    top_shap_drivers: list[str] = Field(default_factory=list)


class FeatureContribution(BaseModel):
    """One raw feature's TreeSHAP contribution (log-odds) to one customer's score."""

    feature: str
    value: float | str | None = None
    shap: float


class ExplainRequest(BaseModel):
    """``POST /explain`` — explain a raw feature row (fixture or what-if edit)."""

    model_config = ConfigDict(extra="forbid")

    features: CustomerFeatures
    top_n: Optional[int] = Field(default=10, ge=1, le=30)


class ExplainResponse(BaseModel):
    """Per-customer SHAP: ``base_value + sum(shap) + other == margin`` (log-odds)."""

    churn_probability: float
    flagged: bool
    threshold: float
    threshold_logit: float
    run_id: str
    base_value: float
    margin: float
    contributions: list[FeatureContribution]
    other_contribution: float = 0.0
    customer_id: Optional[str] = None


class PredictionRow(BaseModel):
    """One scored customer in the prediction browser (probability re-scored server-side)."""

    customer_id: str
    month: Optional[str] = None
    churn_probability: float
    flagged: bool
    rank: int
    actual_churned: Optional[int] = None
    features: dict[str, Any] = Field(default_factory=dict)


class PredictionPage(BaseModel):
    """``GET /predictions`` — one page of the scored cohort, highest risk first."""

    source: str
    cohort_is_fixture: bool
    month: Optional[str] = None
    total: int
    flagged_total: int
    matched: int
    threshold: float
    run_id: str
    rows: list[PredictionRow]


class HealthResponse(BaseModel):
    """``GET /health`` glass-box: model load state, ops cut, Azure flag (demo-safe)."""

    status: str
    model_loaded: bool
    run_id: Optional[str] = None
    threshold: Optional[float] = None
    threshold_rule: Optional[str] = None
    azure_configured: bool
    utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RagAskRequest(BaseModel):
    """``POST /rag/ask`` — methodology Q&A grounded in the committed final report."""

    model_config = ConfigDict(extra="forbid")

    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=3, ge=1, le=10)


class RagAskResponse(BaseModel):
    """Grounded answer + the fused/reranked chunks that produced it (ADR 015)."""

    answer: str
    sources: list[str]
    retrieval_mode: str
    hybrid: bool
    reranked: bool


class FairnessResponse(BaseModel):
    """``GET /model/fairness`` — Equalized Odds disclosure at the ops threshold (ADR 012)."""

    n_sample: int
    min_group_n: int
    threshold: float
    selection_rate_diff_age: float
    equalized_odds_difference_age: float
    equalized_odds_ratio_age: float
    equalized_odds_difference_state: float
    equalized_odds_ratio_state: float
    state_groups_total: int
    state_groups_kept: int
    state_rows_excluded: int
    source: str


class VivaGradeRequest(BaseModel):
    """``POST /viva/grade`` — mark one Explain-it answer against its rubric (ADR-EDU-003).

    ``extra="forbid"`` for the same reason as ``DraftCreateRequest``: the client
    supplies the answer, never the verdict.
    """

    model_config = ConfigDict(extra="forbid")

    prompt_id: str = Field(..., min_length=1, max_length=64)
    prompt: str = Field(..., min_length=1, max_length=1000)
    rubric: list[str] = Field(..., min_length=1, max_length=12)
    answer: str = Field(..., min_length=1, max_length=6000)


class RubricVerdictResponse(BaseModel):
    """One rubric point, marked, with the learner's own sentence as evidence."""

    index: int
    point: str
    covered: bool
    evidence: str = ""
    comment: str = ""


class VivaGradeResponse(BaseModel):
    """Marking outcome. ``available=False`` means *not marked*, never *failed*."""

    prompt_id: str
    available: bool
    cleared: bool
    covered_count: int
    total_points: int
    points: list[RubricVerdictResponse] = Field(default_factory=list)
    feedback: str = ""
    reason: str = ""
