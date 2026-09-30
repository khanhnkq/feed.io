#!/usr/bin/env python3
"""Feedi SMTP Email Delivery Verification Script

Use this script to verify your SMTP configuration (Mailpit, Resend, Brevo, Gmail, SendGrid, etc.)
Usage:
    python scripts/test_email_delivery.py [recipient_email]

Example:
    python scripts/test_email_delivery.py user@example.com
"""

import asyncio
from datetime import datetime, timezone
from email.message import EmailMessage
import os
import sys
import time
from pathlib import Path

# Add apps/backend/src to Python path so we can import feedio modules
backend_src = Path(__file__).resolve().parent.parent / "apps" / "backend" / "src"
if str(backend_src) not in sys.path:
    sys.path.insert(0, str(backend_src))

try:
    from feedio.bootstrap.config import Settings
    from feedio.shared.infrastructure.smtp_sender import (
        resolve_smtp_tls_mode,
        send_smtp_message,
    )
except ImportError as e:
    print(f"Error: Unable to import Feed.io backend modules: {e}")
    sys.exit(1)


def mask_secret(val: str | None) -> str:
    if not val:
        return "<not set>"
    if len(val) <= 4:
        return "****"
    return f"{val[:2]}...{val[-2:]} ({len(val)} chars)"


async def verify_email_delivery(recipient: str) -> bool:
    settings = Settings()

    host = settings.smtp_host
    port = settings.smtp_port
    sender = settings.smtp_sender
    username = settings.smtp_username
    password = settings.smtp_password
    start_tls = settings.smtp_start_tls
    use_tls = settings.smtp_use_tls

    effective_use_tls, effective_start_tls = resolve_smtp_tls_mode(
        port=port,
        start_tls=start_tls,
        use_tls=use_tls,
    )

    if effective_use_tls:
        tls_label = "Direct TLS / SSL (use_tls=True)"
    elif effective_start_tls:
        tls_label = "STARTTLS (start_tls=True)"
    else:
        tls_label = "Plaintext (No encryption)"

    print("=" * 65)
    print(" Feedi SMTP Configuration Diagnostic")
    print("=" * 65)
    print(f"  SMTP Host     : {host}")
    print(f"  SMTP Port     : {port}")
    print(f"  Encryption    : {tls_label}")
    print(f"  Sender (From) : {sender}")
    print(f"  Username      : {username or '<none>'}")
    print(f"  Password      : {mask_secret(password)}")
    print(f"  Recipient (To): {recipient}")
    print("=" * 65)
    print("--> Connecting to SMTP server and dispatching test message...")

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = f"[Feedi] SMTP Diagnostic Test Message ({now_utc})"

    text_body = f"""Hello from Feedi!

This is a test email sent from your Feedi instance to verify external SMTP connectivity.

Diagnostic Details:
- SMTP Host: {host}:{port}
- Security: {tls_label}
- Sent at: {now_utc}

If you received this message, your Feedi mail service is functioning properly.
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; }}
    .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border: 2px solid #000000; box-shadow: 4px 4px 0px #000000; padding: 32px; }}
    .badge {{ display: inline-block; background: #22c55e; color: #000000; font-weight: 700; font-size: 12px; padding: 4px 8px; border: 1.5px solid #000; text-transform: uppercase; margin-bottom: 16px; }}
    h1 {{ margin: 0 0 16px; font-size: 22px; color: #111827; }}
    p {{ color: #4b5563; line-height: 1.6; font-size: 14px; }}
    .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; background: #fafafa; border: 1px solid #e5e7eb; }}
    .info-table td {{ padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }}
    .info-table td.label {{ font-weight: 600; color: #374151; width: 35%; }}
    .footer {{ margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SMTP Connectivity Verified</div>
    <h1>Feedi Mail Service Test</h1>
    <p>Your external SMTP configuration has been successfully verified. Transactional emails (account verification, password reset, team invitations, and billing alerts) are ready to send.</p>
    
    <table class="info-table">
      <tr><td class="label">SMTP Host</td><td>{host}:{port}</td></tr>
      <tr><td class="label">Encryption</td><td>{tls_label}</td></tr>
      <tr><td class="label">Sender</td><td>{sender}</td></tr>
      <tr><td class="label">Timestamp</td><td>{now_utc}</td></tr>
    </table>
    
    <div class="footer">Feedi &bull; Open-Source Video Collaboration Platform</div>
  </div>
</body>
</html>"""

    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    start_time = time.monotonic()
    try:
        await send_smtp_message(
            message=message,
            host=host,
            port=port,
            sender=sender,
            username=username,
            password=password,
            start_tls=start_tls,
            use_tls=use_tls,
            timeout_seconds=20.0,
        )
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        print(f"\n[OK] SUCCESS: Test email successfully sent to <{recipient}> in {elapsed_ms}ms!")
        return True
    except Exception as e:
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        print(f"\n[FAIL] ERROR: Email delivery failed after {elapsed_ms}ms!")
        print(f"Exception Type : {type(e).__name__}")
        print(f"Details        : {e}\n")

        print("Troubleshooting Suggestions:")
        if "Authentication" in str(type(e).__name__) or "auth" in str(e).lower():
            print("  1. Authentication failure: check your SMTP username and password.")
            print("  2. If using Gmail: ensure you are using a 16-character App Password, NOT your normal Gmail password.")
            print("  3. If using Resend: ensure username is 'resend' and password starts with 're_'.")
            print("  4. If using Brevo: ensure you are using the Master SMTP key from Brevo dashboard.")
        elif "Connect" in str(type(e).__name__) or "connection" in str(e).lower():
            print(f"  1. Connection refused or timed out connecting to {host}:{port}.")
            print("  2. Verify your internet connection or check if port 587/465 is blocked by your ISP/hosting firewall.")
            print("  3. If testing locally with Mailpit, make sure Docker is running: `make dev` or `make infra-up`.")
        elif "sender" in str(e).lower() or "550" in str(e) or "554" in str(e):
            print("  1. Sender address rejected: ensure FEEDIO_SMTP_SENDER uses a domain verified on your email provider.")
        return False


def main() -> None:
    recipient = sys.argv[1] if len(sys.argv) > 1 else None
    if not recipient:
        default_recipient = os.environ.get("FEEDIO_SMTP_TEST_RECIPIENT", "test@feedio.local")
        print(f"No recipient specified. Using default: {default_recipient}")
        print("Tip: Provide a recipient email via argument: python scripts/test_email_delivery.py you@example.com\n")
        recipient = default_recipient

    success = asyncio.run(verify_email_delivery(recipient))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
