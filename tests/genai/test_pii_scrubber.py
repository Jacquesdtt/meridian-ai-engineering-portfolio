"""Unit tests for the PII scrubber (ZDR compliance)."""
from __future__ import annotations

from src.genai.pii_scrubber import scrub_mapping, scrub_text


def test_scrub_text_emails():
    assert scrub_text("Email me at user@example.com.") == "Email me at [REDACTED_EMAIL]."
    assert scrub_text("My emails: a@b.co, x.y@z.com") == "My emails: [REDACTED_EMAIL], [REDACTED_EMAIL]"


def test_scrub_text_phones():
    assert scrub_text("Call 123-456-7890 please.") == "Call [REDACTED_PHONE] please."
    assert scrub_text("Call (123) 456-7890 please.") == "Call [REDACTED_PHONE] please."
    assert scrub_text("Call +1-123-456-7890 please.") == "Call [REDACTED_PHONE] please."


def test_scrub_text_ssn():
    assert scrub_text("SSN is 123-45-6789.") == "SSN is [REDACTED_SSN]."


def test_scrub_text_long_digit():
    # Long digit sequences like account numbers
    assert scrub_text("Account: 123456789012.") == "Account: [REDACTED_ID]."


def test_scrub_text_dob():
    assert scrub_text("DOB: 1980-05-12.") == "DOB: [REDACTED_DATE]."
    assert scrub_text("DOB: 1999/12/31.") == "DOB: [REDACTED_DATE]."


def test_scrub_mapping_drops_blocked_keys():
    payload = {
        "customer_id": 123,
        "Customer_ID": "456",
        "email": "test@test.com",
        "Name": "John Doe",
        "dob": "1990-01-01",
        "account_number": 999999999,
        "state": "CA",
        "age": 35
    }
    clean = scrub_mapping(payload)
    
    # Blocked keys should be completely removed
    assert "customer_id" not in clean
    assert "Customer_ID" not in clean
    assert "email" not in clean
    assert "Name" not in clean
    assert "dob" not in clean
    assert "account_number" not in clean
    
    # Safe keys should remain
    assert clean["state"] == "CA"
    assert clean["age"] == 35


def test_scrub_mapping_scrubs_values():
    payload = {
        "notes": "Customer's email is test@example.com",
        "contact_list": ["a@b.com", "c@d.com"],
        "safe_int": 42
    }
    clean = scrub_mapping(payload)
    
    assert clean["notes"] == "Customer's email is [REDACTED_EMAIL]"
    assert clean["contact_list"] == ["[REDACTED_EMAIL]", "[REDACTED_EMAIL]"]
    assert clean["safe_int"] == 42


def test_sanitize_llm_draft_scrubs_subject_and_body():
    """Azure JSON may invent PII in subject/body — scrub both before persist."""
    from src.genai.drafter import sanitize_llm_draft

    draft = sanitize_llm_draft(
        {
            "subject": "Hi — email me at a@b.com",
            "body": "Call 123-456-7890 about your balance.",
            "offered_interest_rate": 0.02,
            "drivers": ["evil@x.com"],
        },
        fallback_drivers=["Running_Balance_Rounded", "gone_this_month"],
    )
    assert "[REDACTED_EMAIL]" in draft.subject
    assert "a@b.com" not in draft.subject
    assert "[REDACTED_PHONE]" in draft.body
    assert draft.offered_interest_rate == 0.02
    assert draft.drivers == ["Running_Balance_Rounded", "gone_this_month"]
