from datetime import UTC, datetime
from uuid import UUID, uuid4

from feedio.modules.organizations.domain.entities import (
    OrganizationInvitation,
    OrganizationMember,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.errors import (
    OrganizationNotFoundError,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationRole,
    UserReceivedInvitationDetails,
)


class InMemoryOrganizationRepository:
    def __init__(self) -> None:
        self.members: list[OrganizationMember] = []
        self.invitations: list[OrganizationInvitation] = []
        self.organizations: dict[UUID, OrganizationSummary] = {}
        self.registered_users: dict[str, UUID] = {}
        self.token_map: dict[str, UUID] = {}

    async def create_with_owner(self, *, user_id: UUID, name: str) -> OrganizationSummary:
        org_id = uuid4()
        org = OrganizationSummary(org_id, name, "test-org")
        self.organizations[org_id] = org
        self.members.append(
            OrganizationMember(
                org_id,
                user_id,
                "owner@test.com",
                "Owner",
                OrganizationRole.OWNER,
                "active",
                datetime.now(UTC),
            )
        )
        return org

    async def list_for_user(self, user_id: UUID) -> list[OrganizationSummary]:
        org_ids = [
            m.organization_id for m in self.members if m.user_id == user_id and m.status == "active"
        ]
        return [self.organizations[oid] for oid in org_ids if oid in self.organizations]

    async def get_by_slug(self, slug: str, user_id: UUID) -> OrganizationSummary | None:
        for org in self.organizations.values():
            if org.slug == slug:
                return org
        return None

    async def get_by_id(self, organization_id: UUID, user_id: UUID) -> OrganizationSummary | None:
        return self.organizations.get(organization_id)

    async def update_organization(
        self,
        *,
        organization_id: UUID,
        name: str,
    ) -> OrganizationSummary:
        if organization_id not in self.organizations:
            raise OrganizationNotFoundError("Organization not found")
        old = self.organizations[organization_id]
        updated = OrganizationSummary(old.id, name, old.slug)
        self.organizations[organization_id] = updated
        return updated

    async def delete_organization(self, *, organization_id: UUID) -> None:
        if organization_id not in self.organizations:
            raise OrganizationNotFoundError("Organization not found")
        del self.organizations[organization_id]
        self.members = [m for m in self.members if m.organization_id != organization_id]
        self.invitations = [
            inv for inv in self.invitations if inv.organization_id != organization_id
        ]

    async def list_members(self, organization_id: UUID) -> list[OrganizationMember]:
        return [
            m for m in self.members if m.organization_id == organization_id and m.status == "active"
        ]

    async def find_member(self, organization_id: UUID, user_id: UUID) -> OrganizationMember | None:
        for m in self.members:
            if m.organization_id == organization_id and m.user_id == user_id:
                return m
        return None

    async def update_member_role(
        self, *, organization_id: UUID, user_id: UUID, new_role: OrganizationRole
    ) -> None:
        for idx, m in enumerate(self.members):
            if m.organization_id == organization_id and m.user_id == user_id:
                self.members[idx] = OrganizationMember(
                    m.organization_id,
                    m.user_id,
                    m.email,
                    m.display_name,
                    new_role,
                    m.status,
                    m.joined_at,
                )

    async def remove_member(self, *, organization_id: UUID, user_id: UUID) -> None:
        self.members = [
            m
            for m in self.members
            if not (m.organization_id == organization_id and m.user_id == user_id)
        ]

    async def count_active_owners(self, organization_id: UUID) -> int:
        return len(
            [
                m
                for m in self.members
                if m.organization_id == organization_id
                and m.organization_role == OrganizationRole.OWNER
                and m.status == "active"
            ]
        )

    async def is_user_registered_and_verified(self, email: str) -> bool:
        return email in self.registered_users

    async def find_user_id_by_email(self, email: str) -> UUID | None:
        return self.registered_users.get(email)

    async def find_user_email_by_id(self, user_id: UUID) -> str | None:
        for email, uid in self.registered_users.items():
            if uid == user_id:
                return email
        return None

    async def create_invitation(
        self,
        *,
        organization_id: UUID,
        email: str,
        role: OrganizationRole,
        token_hash: str,
        invited_by_user_id: UUID,
        expires_at: datetime,
    ) -> OrganizationInvitation:
        inv = OrganizationInvitation(
            id=uuid4(),
            organization_id=organization_id,
            email=email,
            role=role,
            invited_by_user_id=invited_by_user_id,
            invited_by_name="Inviter",
            created_at=datetime.now(UTC),
            expires_at=expires_at,
        )
        self.invitations.append(inv)
        self.token_map[token_hash] = inv.id
        return inv

    async def list_active_invitations(self, organization_id: UUID) -> list[OrganizationInvitation]:
        return [
            inv
            for inv in self.invitations
            if inv.organization_id == organization_id
            and inv.accepted_at is None
            and inv.revoked_at is None
        ]

    async def list_active_invitations_for_email(
        self, email: str
    ) -> list[UserReceivedInvitationDetails]:
        results: list[UserReceivedInvitationDetails] = []
        for inv in self.invitations:
            if (
                inv.email.lower() == email.lower()
                and inv.accepted_at is None
                and inv.revoked_at is None
            ):
                org = self.organizations.get(inv.organization_id)
                results.append(
                    UserReceivedInvitationDetails(
                        id=inv.id,
                        organization_id=inv.organization_id,
                        organization_name=org.name if org else "Org",
                        organization_slug=org.slug if org else "org",
                        role=inv.role,
                        invited_by_name=inv.invited_by_name,
                        created_at=inv.created_at,
                        expires_at=inv.expires_at,
                    )
                )
        return results

    async def find_invitation_by_id(
        self, organization_id: UUID, invitation_id: UUID
    ) -> OrganizationInvitation | None:
        for inv in self.invitations:
            if inv.organization_id == organization_id and inv.id == invitation_id:
                return inv
        return None

    async def find_invitation_by_id_only(
        self, invitation_id: UUID
    ) -> OrganizationInvitation | None:
        for inv in self.invitations:
            if inv.id == invitation_id:
                return inv
        return None

    async def find_invitation_by_token_hash(
        self, token_hash: str
    ) -> tuple[OrganizationInvitation, OrganizationSummary] | None:
        inv_id = self.token_map.get(token_hash)
        if not inv_id:
            return None
        for inv in self.invitations:
            if inv.id == inv_id:
                org = self.organizations.get(inv.organization_id)
                if org:
                    return inv, org
        return None

    async def revoke_invitation(self, *, organization_id: UUID, invitation_id: UUID) -> None:
        for idx, inv in enumerate(self.invitations):
            if inv.organization_id == organization_id and inv.id == invitation_id:
                self.invitations[idx] = OrganizationInvitation(
                    inv.id,
                    inv.organization_id,
                    inv.email,
                    inv.role,
                    inv.invited_by_user_id,
                    inv.invited_by_name,
                    inv.created_at,
                    inv.expires_at,
                    accepted_at=None,
                    revoked_at=datetime.now(UTC),
                )

    async def decline_invitation(self, *, invitation_id: UUID) -> None:
        for idx, inv in enumerate(self.invitations):
            if inv.id == invitation_id:
                self.invitations[idx] = OrganizationInvitation(
                    inv.id,
                    inv.organization_id,
                    inv.email,
                    inv.role,
                    inv.invited_by_user_id,
                    inv.invited_by_name,
                    inv.created_at,
                    inv.expires_at,
                    accepted_at=None,
                    revoked_at=datetime.now(UTC),
                )

    async def accept_invitation(
        self, *, invitation_id: UUID, user_id: UUID
    ) -> OrganizationSummary:
        for idx, inv in enumerate(self.invitations):
            if inv.id == invitation_id:
                self.invitations[idx] = OrganizationInvitation(
                    inv.id,
                    inv.organization_id,
                    inv.email,
                    inv.role,
                    inv.invited_by_user_id,
                    inv.invited_by_name,
                    inv.created_at,
                    inv.expires_at,
                    accepted_at=datetime.now(UTC),
                    revoked_at=None,
                )
                self.members.append(
                    OrganizationMember(
                        inv.organization_id,
                        user_id,
                        inv.email,
                        "User",
                        inv.role,
                        "active",
                        datetime.now(UTC),
                    )
                )
                return self.organizations[inv.organization_id]
        raise OrganizationNotFoundError("Invitation not found")
