from email.message import EmailMessage
from unittest.mock import AsyncMock, patch

import pytest

from feedio.bootstrap.config import Settings
from feedio.modules.billing.infrastructure.mailer import SmtpBillingMailer
from feedio.modules.identity.infrastructure.mailer import SmtpAuthMailer
from feedio.modules.organizations.domain.value_objects import OrganizationRole
from feedio.modules.organizations.infrastructure.mailer import SmtpOrganizationMailer
from feedio.shared.infrastructure.smtp_sender import resolve_smtp_tls_mode, send_smtp_message


def test_resolve_smtp_tls_mode() -> None:
    # Port 465 (SSL/TLS direct)
    use_tls, start_tls = resolve_smtp_tls_mode(port=465)
    assert use_tls is True
    assert start_tls is False

    # Port 587 (STARTTLS)
    use_tls, start_tls = resolve_smtp_tls_mode(port=587)
    assert use_tls is False
    assert start_tls is True

    # Port 1025 (Local Mailpit/Dev)
    use_tls, start_tls = resolve_smtp_tls_mode(port=1025)
    assert use_tls is False
    assert start_tls is False

    # Explicit use_tls overrides port 587
    use_tls, start_tls = resolve_smtp_tls_mode(port=587, use_tls=True)
    assert use_tls is True
    assert start_tls is False

    # Explicit start_tls overrides port 465
    use_tls, start_tls = resolve_smtp_tls_mode(port=465, start_tls=True)
    assert use_tls is False
    assert start_tls is True


@pytest.mark.asyncio
async def test_send_smtp_message_passes_auth_and_tls() -> None:
    msg = EmailMessage()
    msg["From"] = "sender@feedio.local"
    msg["To"] = "receiver@example.com"
    msg["Subject"] = "Hello"
    msg.set_content("Test body")

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await send_smtp_message(
            message=msg,
            host="smtp.resend.com",
            port=465,
            sender="sender@feedio.local",
            username="resend",
            password="re_123456789",
        )

        mock_send.assert_awaited_once()
        _, kwargs = mock_send.call_args
        assert kwargs["hostname"] == "smtp.resend.com"
        assert kwargs["port"] == 465
        assert kwargs["username"] == "resend"
        assert kwargs["password"] == "re_123456789"
        assert kwargs["use_tls"] is True
        assert kwargs["start_tls"] is False


@pytest.mark.asyncio
async def test_send_smtp_message_start_tls_brevo() -> None:
    msg = EmailMessage()
    msg["From"] = "sender@company.com"
    msg["To"] = "client@example.com"
    msg["Subject"] = "Brevo Test"
    msg.set_content("Test content")

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await send_smtp_message(
            message=msg,
            host="smtp-relay.brevo.com",
            port=587,
            sender="sender@company.com",
            username="brevo-user@example.com",
            password="master-smtp-key",
        )

        mock_send.assert_awaited_once()
        _, kwargs = mock_send.call_args
        assert kwargs["hostname"] == "smtp-relay.brevo.com"
        assert kwargs["port"] == 587
        assert kwargs["username"] == "brevo-user@example.com"
        assert kwargs["password"] == "master-smtp-key"
        assert kwargs["use_tls"] is False
        assert kwargs["start_tls"] is True


@pytest.mark.asyncio
async def test_smtp_auth_mailer_delegates_credentials() -> None:
    mailer = SmtpAuthMailer(
        host="smtp.gmail.com",
        port=587,
        sender="noreply@gmail.com",
        web_base_url="https://app.feedio.com",
        username="user@gmail.com",
        password="app-password-16char",
    )

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await mailer.send_verification("newuser@example.com", "tok123", "New User")

        mock_send.assert_awaited_once()
        _, kwargs = mock_send.call_args
        assert kwargs["hostname"] == "smtp.gmail.com"
        assert kwargs["username"] == "user@gmail.com"
        assert kwargs["password"] == "app-password-16char"
        assert kwargs["start_tls"] is True


@pytest.mark.asyncio
async def test_smtp_organization_mailer_delegates_credentials() -> None:
    mailer = SmtpOrganizationMailer(
        host="smtp.resend.com",
        port=465,
        sender="invites@studio.com",
        web_base_url="https://app.feedio.com",
        username="resend",
        password="re_secret",
        use_tls=True,
    )

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await mailer.send_invitation(
            email="editor@agency.com",
            inviter_name="Alice",
            organization_name="Pixel Studio",
            role=OrganizationRole.MEMBER,
            token="inv-token-999",
        )

        mock_send.assert_awaited_once()
        _, kwargs = mock_send.call_args
        assert kwargs["hostname"] == "smtp.resend.com"
        assert kwargs["port"] == 465
        assert kwargs["username"] == "resend"
        assert kwargs["use_tls"] is True


@pytest.mark.asyncio
async def test_smtp_billing_mailer_delegates_credentials() -> None:
    mailer = SmtpBillingMailer(
        host="smtp-relay.brevo.com",
        port=587,
        sender="billing@feedio.com",
        web_base_url="https://app.feedio.com",
        username="brevo-acc",
        password="smtp-password",
    )

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await mailer.send_expiring_reminder(
            email="owner@studio.com",
            organization_name="Creative Studio",
            plan_tier="pro_500gb",
            days_left=3,
            expiration_date_str="2026-10-15",
            quota_str="500 GB",
            renew_url="https://app.feedio.com/billing",
        )

        mock_send.assert_awaited_once()
        _, kwargs = mock_send.call_args
        assert kwargs["hostname"] == "smtp-relay.brevo.com"
        assert kwargs["username"] == "brevo-acc"
        assert kwargs["start_tls"] is True


def test_settings_smtp_aliases(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FEEDIO_SMTP_USER", "custom_user")
    monkeypatch.setenv("FEEDIO_SMTP_PASS", "custom_pass")
    monkeypatch.setenv("FEEDIO_SMTP_USE_TLS", "true")
    monkeypatch.setenv("FEEDIO_SMTP_HOST", "smtp.custom.com")
    monkeypatch.setenv("FEEDIO_SMTP_PORT", "465")

    settings = Settings()
    assert settings.smtp_username == "custom_user"
    assert settings.smtp_password == "custom_pass"
    assert settings.smtp_use_tls is True
    assert settings.smtp_host == "smtp.custom.com"
    assert settings.smtp_port == 465
