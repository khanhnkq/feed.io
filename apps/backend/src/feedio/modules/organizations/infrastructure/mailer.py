from email.message import EmailMessage

import aiosmtplib

from feedio.modules.organizations.domain.value_objects import OrganizationRole
from feedio.modules.organizations.infrastructure.email_templates import (
    render_organization_invitation_email,
)


class SmtpOrganizationMailer:
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
            subject=f"Invitation to join {organization_name} on Feed.io",
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
