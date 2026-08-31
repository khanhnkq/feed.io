from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CommentAuthorResponse(BaseModel):
    id: UUID
    name: str | None = None
    email: str | None = None
    avatar_url: str | None = None


class CreateCommentRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    parent_comment_id: UUID | None = None
    timestamp_seconds: float | None = None
    frame_number: int | None = None
    annotation_data: dict[str, Any] | None = None


class UpdateCommentRequest(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=5000)
    status: str | None = Field(default=None, pattern="^(open|resolved)$")


class CommentResponse(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    media_id: UUID
    user_id: UUID
    parent_comment_id: UUID | None = None
    timestamp_seconds: float | None = None
    frame_number: int | None = None
    content: str
    annotation_data: dict[str, Any] | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    author: CommentAuthorResponse | None = None
    replies: list["CommentResponse"] = Field(default_factory=list)


CommentResponse.model_rebuild()
