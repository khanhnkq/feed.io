from email.message import EmailMessage
from typing import Protocol

import aiosmtplib
import structlog

logger = structlog.get_logger()


class BillingMailer(Protocol):
    async def send_expiring_reminder(
        self,
        *,
        email: str,
        organization_name: str,
        plan_tier: str,
        days_left: int,
        expiration_date_str: str,
        quota_str: str,
        renew_url: str,
    ) -> None: ...

    async def send_cancellation_confirmation(
        self,
        *,
        email: str,
        organization_name: str,
        plan_tier: str,
        effective_date_str: str,
    ) -> None: ...

    async def send_renewal_confirmation(
        self,
        *,
        email: str,
        organization_name: str,
        plan_tier: str,
        new_expiration_date_str: str,
        quota_str: str,
    ) -> None: ...


def _format_plan_title(plan_tier: str) -> str:
    mapping = {
        "free": "Free (5 GB)",
        "pro_100gb": "Pro 100 GB",
        "pro_500gb": "Pro 500 GB",
        "pro_1tb": "Pro 1 TB",
        "enterprise": "Enterprise",
    }
    return mapping.get(plan_tier, plan_tier.capitalize())


class SmtpBillingMailer:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        sender: str,
        web_base_url: str,
        start_tls: bool = False,
    ) -> None:
        self._host = host
        self._port = port
        self._sender = sender
        self._web_base_url = web_base_url.rstrip("/")
        self._start_tls = start_tls

    async def send_expiring_reminder(
        self,
        *,
        email: str,
        organization_name: str,
        plan_tier: str,
        days_left: int,
        expiration_date_str: str,
        quota_str: str,
        renew_url: str,
    ) -> None:
        plan_title = _format_plan_title(plan_tier)
        subject = f"[Feedi] Action Required: {plan_title} plan expires in {days_left} days"

        text_body = (
            f"Hello,\n\n"
            f"The {plan_title} plan for organization \"{organization_name}\" "
            f"will expire on {expiration_date_str} ({days_left} days remaining).\n\n"
            f"Important Notice: Feedi does NOT automatically renew or charge your card.\n"
            f"To keep your storage capacity ({quota_str}) and Pro features without disruption, "
            f"please renew manually before the expiration date.\n\n"
            f"Renew your plan at: {renew_url}\n\n"
            f"If your subscription expires, your workspace will revert to Free (5 GB).\n\n"
            f"Best regards,\n"
            f"The Feedi Team\n"
        )

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f7f6f0;
      color: #1c1a17;
      margin: 0;
      padding: 24px;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2ded4;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }}
    .header {{
      background: #1c1a17;
      color: #ffffff;
      padding: 24px 32px;
      text-align: left;
    }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }}
    .content {{ padding: 32px; }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      background: #fff3dc;
      color: #b45309;
      border: 1px solid #fde68a;
      margin-bottom: 16px;
    }}
    .info-box {{
      background: #faf8f5;
      border: 1px solid #e7e3d8;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      font-size: 14px;
    }}
    .info-row {{
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #f0ece1;
    }}
    .info-row:last-child {{ border-bottom: none; }}
    .info-label {{ color: #78716c; }}
    .info-value {{ font-weight: 600; color: #1c1a17; }}
    .cta-button {{
      display: inline-block;
      background: #c6f035;
      color: #1c1a17;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      margin: 24px 0 16px;
      text-align: center;
      border: 1px solid #a3cf1d;
    }}
    .footer {{
      padding: 20px 32px;
      background: #faf8f5;
      border-top: 1px solid #e7e3d8;
      font-size: 12px;
      color: #78716c;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Feedi &bull; Subscription Expiration Notice</h1>
    </div>
    <div class="content">
      <div class="badge">&bull; {days_left} days remaining</div>
      <p style="font-size: 16px; line-height: 1.5; margin: 0 0 16px;">
        The subscription for <strong>{organization_name}</strong> will expire on
        <strong>{expiration_date_str}</strong>.
      </p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Current Plan:</span>
          <span class="info-value">{plan_title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Storage Capacity:</span>
          <span class="info-value">{quota_str}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Expiration Date:</span>
          <span class="info-value">{expiration_date_str}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Renewal Policy:</span>
          <span class="info-value" style="color: #b45309;">Manual renewal only</span>
        </div>
      </div>
      <p style="font-size: 13px; color: #57534e; line-height: 1.6;">
        Feedi does not automatically charge your payment method.
        To keep your video storage and collaboration features uninterrupted,
        please renew your subscription.
      </p>
      <div style="text-align: center;">
        <a href="{renew_url}" class="cta-button">Renew Subscription Now &rarr;</a>
      </div>
    </div>
    <div class="footer">
      This email was automatically sent by Feedi to administrators of {organization_name}.
    </div>
  </div>
</body>
</html>
"""
        await self._send(
            recipient=email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )

    async def send_cancellation_confirmation(
        self,
        *,
        email: str,
        organization_name: str,
        plan_tier: str,
        effective_date_str: str,
    ) -> None:
        plan_title = _format_plan_title(plan_tier)
        subject = f"[Feedi] Cancellation confirmed for {plan_title} ({organization_name})"
        text_body = (
            f"Hello,\n\n"
            f"You requested to cancel the {plan_title} plan for \"{organization_name}\".\n"
            f"The subscription has been cancelled and will revert to Free (5 GB) "
            f"on {effective_date_str}.\n\n"
            f"Thank you for using Feedi. You can re-upgrade anytime at: {self._web_base_url}\n\n"
            f"Best regards,\n"
            f"The Feedi Team\n"
        )
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f7f6f0;
      color: #1c1a17;
      padding: 24px;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2ded4;
      border-radius: 12px;
      overflow: hidden;
    }}
    .header {{ background: #1c1a17; color: #fff; padding: 20px 32px; }}
    .header h1 {{ margin: 0; font-size: 18px; }}
    .content {{ padding: 32px; font-size: 14px; line-height: 1.6; }}
    .box {{
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      color: #991b1b;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Feedi &bull; Cancellation Confirmation</h1>
    </div>
    <div class="content">
      <div class="box">
        <strong>{plan_title} plan cancellation confirmed</strong>
      </div>
      <p>
        Your subscription for <strong>{organization_name}</strong> will revert to the
        Free tier (5 GB) on <strong>{effective_date_str}</strong>.
      </p>
      <p>All media files uploaded prior to cancellation remain safely stored.</p>
    </div>
  </div>
</body>
</html>"""
        await self._send(
            recipient=email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )

    async def send_renewal_confirmation(
        self,
        *,
        email: str,
        organization_name: str,
        plan_tier: str,
        new_expiration_date_str: str,
        quota_str: str,
    ) -> None:
        plan_title = _format_plan_title(plan_tier)
        subject = f"[Feedi] {plan_title} renewed successfully!"
        text_body = (
            f"Hello,\n\n"
            f"The {plan_title} plan for \"{organization_name}\" has been successfully renewed.\n"
            f"New expiration date: {new_expiration_date_str}\n"
            f"Storage capacity: {quota_str}\n\n"
            f"Thank you for creating with Feedi!\n\n"
            f"Best regards,\n"
            f"The Feedi Team\n"
        )
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f7f6f0;
      color: #1c1a17;
      padding: 24px;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2ded4;
      border-radius: 12px;
      overflow: hidden;
    }}
    .header {{ background: #1c1a17; color: #fff; padding: 20px 32px; }}
    .content {{ padding: 32px; font-size: 14px; line-height: 1.6; }}
    .success-box {{
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      color: #065f46;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 18px;">Feedi &bull; Renewal Successful</h1>
    </div>
    <div class="content">
      <div class="success-box">
        <strong>{plan_title} plan renewed successfully!</strong>
      </div>
      <p>
        Your subscription for <strong>{organization_name}</strong> is now active through
        <strong>{new_expiration_date_str}</strong> with <strong>{quota_str}</strong> capacity.
      </p>
    </div>
  </div>
</body>
</html>"""
        await self._send(
            recipient=email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )

    async def _send(
        self,
        *,
        recipient: str,
        subject: str,
        text_body: str,
        html_body: str,
    ) -> None:
        try:
            message = EmailMessage()
            message["From"] = self._sender
            message["To"] = recipient
            message["Subject"] = subject
            message.set_content(text_body)
            message.add_alternative(html_body, subtype="html")
            await aiosmtplib.send(
                message,
                hostname=self._host,
                port=self._port,
                start_tls=self._start_tls,
            )
            logger.info("billing_email_sent", recipient=recipient, subject=subject)
        except Exception as e:
            logger.warn("billing_email_failed", recipient=recipient, error=str(e))
