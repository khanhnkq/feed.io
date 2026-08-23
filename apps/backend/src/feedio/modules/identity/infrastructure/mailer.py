from email.message import EmailMessage
from urllib.parse import urlencode

import aiosmtplib


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
        await self._send(
            email,
            "Verify your Feed.io email",
            f"Hi {display_name},\n\nVerify your email to activate Feed.io:\n{url}\n\n"
            "This link expires in 24 hours.",
        )

    async def send_password_reset(self, email: str, display_name: str, token: str) -> None:
        url = f"{self._web_base_url}/reset-password?{urlencode({'token': token})}"
        await self._send(
            email,
            "Reset your Feed.io password",
            f"Hi {display_name},\n\nReset your Feed.io password:\n{url}\n\n"
            "This link expires in 60 minutes. Ignore this email if you did not request it.",
        )

    async def _send(self, recipient: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self._sender
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)
        await aiosmtplib.send(
            message,
            hostname=self._host,
            port=self._port,
            start_tls=self._start_tls,
        )
