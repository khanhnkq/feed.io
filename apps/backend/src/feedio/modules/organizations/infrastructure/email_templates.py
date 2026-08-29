from html import escape

from feedio.modules.identity.infrastructure.email_templates import render_email_html
from feedio.modules.organizations.domain.value_objects import OrganizationRole


def render_organization_invitation_email(
    *,
    inviter_name: str,
    organization_name: str,
    role: OrganizationRole,
    action_url: str,
) -> tuple[str, str]:
    if role == OrganizationRole.ADMIN:
        role_label = "Administrator"
    elif role == OrganizationRole.MEMBER:
        role_label = "Member"
    else:
        role_label = "Owner"

    text_content = (
        f"Hi,\n\n"
        f"{inviter_name} has invited you to join '{organization_name}' on Feed.io "
        f"as an {role_label}.\n\n"
        f"Accept your invitation here:\n"
        f"{action_url}\n\n"
        f"This link expires in 7 days.\n\n"
        f"— The Feed.io Team"
    )

    html_content = render_email_html(
        step_badge="TEAM INVITATION",
        heading=f"Join {organization_name}",
        message_body=(
            f"<strong>{escape(inviter_name)}</strong> has invited you to collaborate in "
            f"<strong>{escape(organization_name)}</strong> on Feed.io with the role of "
            f"<strong>{escape(role_label)}</strong>. "
            "Click the button below to accept and get started."
        ),
        action_label="Accept Invitation",
        action_url=action_url,
        footer_note=(
            "This invitation link will expire in 7 days. "
            "If you weren't expecting this invite, you can safely ignore this email."
        ),
        escape_body=False,
    )

    return text_content, html_content
