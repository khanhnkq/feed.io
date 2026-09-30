from email.message import EmailMessage
from urllib.parse import urlencode


from feedio.modules.identity.infrastructure.email_templates import (
    render_password_reset_email,
    render_verification_email,
)
from feedio.shared.infrastructure.smtp_sender import send_smtp_message


class SmtpAuthMailer:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        sender: str,
        web_base_url: str,
        username: str | None = None,
        password: str | None = None,
        start_tls: bool = False,
        use_tls: bool = False,
    ) -> None:
        self._host = host
        self._port = port
        self._sender = sender
        self._web_base_url = web_base_url.rstrip("/")
        self._username = username
        self._password = password
        self._start_tls = start_tls
        self._use_tls = use_tls

    async def send_verification(
        self,
        email: str,
        token: str,
        display_name: str | None = None,
    ) -> None:
        url = f"{self._web_base_url}/verify-email?{urlencode({'token': token})}"
        name = (
            display_name.strip() if display_name and display_name.strip() else email.split("@")[0]
        )
        text_body, html_body = render_verification_email(
            display_name=name,
            action_url=url,
        )
        await self._send(
            recipient=email,
            subject="Verify your Feedi account",
            text_body=text_body,
            html_body=html_body,
        )

    async def send_password_reset(
        self,
        email: str,
        token: str,
        display_name: str | None = None,
    ) -> None:
        url = f"{self._web_base_url}/reset-password?{urlencode({'token': token})}"
        name = (
            display_name.strip() if display_name and display_name.strip() else email.split("@")[0]
        )
        text_body, html_body = render_password_reset_email(
            display_name=name,
            action_url=url,
        )
        await self._send(
            recipient=email,
            subject="Reset your Feedi password",
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
        await send_smtp_message(
            message=message,
            host=self._host,
            port=self._port,
            sender=self._sender,
            username=self._username,
            password=self._password,
            start_tls=self._start_tls,
            use_tls=self._use_tls,
        )
