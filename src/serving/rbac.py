"""Demo Glass-Box RBAC for the Friction-Gate (Sprint 5).

This is **pedagogical** role-based access for Jamie/Sam demos — not corporate
SSO / Entra ID. Streamlit (or callers) pick a role; permissions gate mutate
actions. Compliance can view the audit trail; agents approve/edit; data
scientists see the glass-box (threshold + frozen SHAP). Data scientists and
compliance can browse customer scores with per-customer SHAP; agents cannot.
Still no ``/send``.
"""
from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    """Demo persona shown in the Streamlit picker / ``X-Demo-Role`` header."""

    retention_agent = "retention_agent"
    compliance_viewer = "compliance_viewer"
    data_scientist = "data_scientist"


class Permission(str, Enum):
    """Fine-grained actions gated by ``_ROLE_PERMISSIONS`` (not production IAM)."""

    view_queue = "view_queue"
    edit_draft = "edit_draft"
    approve_reject = "approve_reject"
    create_draft = "create_draft"
    score = "score"
    view_glass_box = "view_glass_box"
    view_audit = "view_audit"
    use_rag_assistant = "use_rag_assistant"
    use_viva_grader = "use_viva_grader"
    # Customer-level scores + per-customer SHAP (prediction browser). Narrower than
    # view_glass_box, which only shows frozen aggregate evidence.
    explain_predictions = "explain_predictions"


_ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.retention_agent: frozenset(
        {
            Permission.view_queue,
            Permission.edit_draft,
            Permission.approve_reject,
            Permission.create_draft,
            Permission.score,
            Permission.view_glass_box,
            Permission.view_audit,  # agents see their own trail (glass-box story)
            Permission.use_rag_assistant,
            Permission.use_viva_grader,
        }
    ),
    Role.compliance_viewer: frozenset(
        {
            Permission.view_queue,
            Permission.view_glass_box,
            Permission.view_audit,
            Permission.use_rag_assistant,
            Permission.use_viva_grader,
            Permission.explain_predictions,  # audit why a customer was flagged
        }
    ),
    Role.data_scientist: frozenset(
        {
            Permission.view_queue,
            Permission.score,
            Permission.create_draft,
            Permission.view_glass_box,
            Permission.explain_predictions,
            Permission.view_audit,
            Permission.use_rag_assistant,
            Permission.use_viva_grader,
        }
    ),
}

ROLE_LABELS: dict[Role, str] = {
    Role.retention_agent: "Retention agent (Approve / Edit / Reject)",
    Role.compliance_viewer: "Compliance viewer (read-only + audit)",
    Role.data_scientist: "Data scientist (score + glass-box)",
}

# Plain-language permission names for non-technical stakeholders (Streamlit
# sidebar). Kept beside the enum so a new Permission cannot crash the UI.
PERMISSION_LABELS: dict[Permission, str] = {
    Permission.view_queue: "see drafts",
    Permission.edit_draft: "edit drafts",
    Permission.approve_reject: "Approve / Reject",
    Permission.create_draft: "create drafts",
    Permission.score: "score customers",
    Permission.view_glass_box: "see model evidence",
    Permission.view_audit: "see audit trail",
    Permission.use_rag_assistant: "ask the methodology bot",
    Permission.use_viva_grader: "use the viva grader",
    Permission.explain_predictions: "browse predictions and per-customer SHAP",
}


def permissions_for(role: Role) -> frozenset[Permission]:
    """Return the frozenset of permissions granted to a demo role."""
    return _ROLE_PERMISSIONS[role]


def can(role: Role, permission: Permission) -> bool:
    """True if ``role`` is allowed ``permission`` in the Glass-Box matrix."""
    return permission in _ROLE_PERMISSIONS[role]


def parse_role(value: str | None) -> Role:
    """Parse a demo role string.

    FastAPI requires an explicit ``X-Demo-Role`` header (see ``app._role_from_header``).
    Streamlit passes the picker value directly. Empty/None is only for local helpers
    that still want a default — API must not call this with a missing header.
    """
    if value is None or value.strip() == "":
        return Role.retention_agent
    try:
        return Role(value.strip())
    except ValueError as exc:
        allowed = ", ".join(r.value for r in Role)
        raise ValueError(f"Unknown demo role {value!r}. Allowed: {allowed}") from exc


def require(role: Role, permission: Permission) -> None:
    """Raise PermissionError if role lacks permission (for API/UI guards)."""
    if not can(role, permission):
        raise PermissionError(
            f"Role {role.value} cannot {permission.value} "
            "(demo Glass-Box RBAC — not production IdP)."
        )
