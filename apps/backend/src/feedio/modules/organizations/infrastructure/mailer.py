from email.message import EmailMessage

from feedio.modules.organizations.domain.value_objects import OrganizationRole
from feedio.modules.organizations.infrastructure.email_templates import (
    render_organization_invitation_email,
)
from feedio.shared.infrastructure.smtp_sender import send_smtp_message


class SmtpOrganizationMailer:
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

    async def send_invitation(
        self,
        *,
        email: str,
        inviter_name: str,
        organization_name: str,
        role: OrganizationRole,
        token: str,
    ) -> None:
        url = f"{self._web_base_url}/invitations/{token}"
        text_body, html_body = render_organization_invitation_email(
            inviter_name=inviter_name,
            organization_name=organization_name,
            role=role,
            action_url=url,
        )
        await self._send(
            recipient=email,
            subject=f"Invitation to join {organization_name} on Feedi",
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
