from email.message import EmailMessage
from urllib.parse import urlencode

import aiosmtplib

from feedio.modules.identity.infrastructure.email_templates import (
    render_password_reset_email,
    render_verification_email,
)


class SmtpAuthMailer:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        sender: str,
        web_base_url: str,
        start_tls: bool,
    ) -> None:
        self._host = host
        self._port = port
        self._sender = sender
        self._web_base_url = web_base_url.rstrip("/")
        self._start_tls = start_tls

    async def send_verification(self, email: str, display_name: str, token: str) -> None:
        url = f"{self._web_base_url}/verify-email?{urlencode({'token': token})}"
        text_body, html_body = render_verification_email(
            display_name=display_name,
            action_url=url,
        )
        await self._send(
            recipient=email,
            subject="Verify your Feed.io account",
            text_body=text_body,
            html_body=html_body,
        )

    async def send_password_reset(self, email: str, display_name: str, token: str) -> None:
        url = f"{self._web_base_url}/reset-password?{urlencode({'token': token})}"
        text_body, html_body = render_password_reset_email(
            display_name=display_name,
            action_url=url,
        )
        await self._send(
            recipient=email,
            subject="Reset your Feed.io password",
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
