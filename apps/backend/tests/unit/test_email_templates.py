from feedio.modules.identity.infrastructure.email_templates import (
    render_password_reset_email,
    render_verification_email,
)


def test_render_verification_email() -> None:
    display_name = "Alex & Partner"
    action_url = "http://localhost:8088/verify-email?token=test-token-123"

    text_body, html_body = render_verification_email(
        display_name=display_name,
        action_url=action_url,
    )

    assert "Alex & Partner" in text_body
    assert action_url in text_body
    assert "24 hours" in text_body

    assert "Alex &amp; Partner" in html_body
    assert action_url in html_body
    assert "feed.io" in html_body
    assert "#d8ff43" in html_body
    assert "Verify Email Address" in html_body


def test_render_password_reset_email() -> None:
    display_name = "Sarah Connor"
    action_url = "http://localhost:8088/reset-password?token=reset-token-456"

    text_body, html_body = render_password_reset_email(
        display_name=display_name,
        action_url=action_url,
    )

    assert "Sarah Connor" in text_body
    assert action_url in text_body
    assert "60 minutes" in text_body

    assert "Sarah Connor" in html_body
    assert action_url in html_body
    assert "Reset Password" in html_body
    assert "PASSWORD RECOVERY" in html_body
