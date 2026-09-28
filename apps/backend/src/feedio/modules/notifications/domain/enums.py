from enum import StrEnum


class NotificationType(StrEnum):
    MENTION = "mention"
    COMMENT_REPLY = "comment_reply"
    REVIEW_DECISION = "review_decision"
    PROJECT_INVITATION = "project_invitation"
    PROJECT_ACCESS_GRANTED = "project_access_granted"
    ORGANIZATION_INVITED = "organization_invited"
    ROLE_UPDATED = "role_updated"
    MEDIA_READY = "media_ready"
    MEDIA_FAILED = "media_failed"
    SUBSCRIPTION_EXPIRING = "subscription_expiring"
    SUBSCRIPTION_CANCELED = "subscription_canceled"
    SUBSCRIPTION_RENEWED = "subscription_renewed"
    SYSTEM = "system"
