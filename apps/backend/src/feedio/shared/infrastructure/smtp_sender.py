from email.message import EmailMessage

import aiosmtplib
import structlog

logger = structlog.get_logger(__name__)


def resolve_smtp_tls_mode(
    *,
    port: int,
    start_tls: bool = False,
    use_tls: bool = False,
) -> tuple[bool, bool]:
    """Resolve mutually exclusive (use_tls, start_tls) flags based on explicit settings or port.

    - Port 465 defaults to direct TLS (use_tls=True, start_tls=False)
    - Port 587 defaults to STARTTLS (use_tls=False, start_tls=True)
    - Port 1025 / 25 / other defaults to plain text unless explicitly requested
    """
    if use_tls:
        return True, False
    if start_tls:
        return False, True
    if port == 465:
        return True, False
    if port == 587:
        return False, True
    return False, False


async def send_smtp_message(
    *,
    message: EmailMessage,
    host: str,
    port: int,
    sender: str,
    username: str | None = None,
    password: str | None = None,
    start_tls: bool = False,
    use_tls: bool = False,
    timeout_seconds: float = 30.0,
) -> None:
    """Send an EmailMessage via SMTP with optional authentication and TLS negotiation.

    Supports:
    - Local dev (Mailpit, Stalwart, Inbucket): host=localhost, port=1025, no auth
    - Resend: host=smtp.resend.com, port=465 (TLS) or 587 (STARTTLS), username=resend
    - Brevo (Sendinblue): host=smtp-relay.brevo.com, port=587, username=..., password=...
    - Google / Gmail: host=smtp.gmail.com, port=587, username=..., password=<app_password>
    - SendGrid: host=smtp.sendgrid.net, port=587, username=apikey, password=...
    - Any standard RFC 5321 / RFC 3207 SMTP server.
    """
    effective_use_tls, effective_start_tls = resolve_smtp_tls_mode(
        port=port,
        start_tls=start_tls,
        use_tls=use_tls,
    )

    clean_username = username.strip() if username and username.strip() else None
    clean_password = password.strip() if password and password.strip() else None

    logger.debug(
        "sending_smtp_message",
        host=host,
        port=port,
        sender=sender,
        has_auth=clean_username is not None,
        use_tls=effective_use_tls,
        start_tls=effective_start_tls,
    )

    await aiosmtplib.send(
        message,
        hostname=host,
        port=port,
        sender=sender,
        username=clean_username,
        password=clean_password,
        use_tls=effective_use_tls,
        start_tls=effective_start_tls,
        timeout=timeout_seconds,
    )
