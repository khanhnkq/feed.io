from enum import StrEnum


class NotificationType(StrEnum):
    MENTION = "mention"
    COMMENT_REPLY = "comment_reply"
    REVIEW_DECISION = "review_decision"
    PROJECT_INVITATION = "project_invitation"
    SYSTEM = "system"
