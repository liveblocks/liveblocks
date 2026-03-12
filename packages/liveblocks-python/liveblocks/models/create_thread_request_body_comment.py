from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.comment_body import CommentBody
    from ..models.comment_metadata import CommentMetadata


@_attrs_define
class CreateThreadRequestBodyComment:
    """
    Attributes:
        user_id (str):
        body (CommentBody):  Example: {'version': 1, 'content': [{'type': 'paragraph', 'children': [{'text': 'Hello '},
            {'text': 'world', 'bold': True}]}]}.
        created_at (datetime.datetime | Unset):
        metadata (CommentMetadata | Unset):
    """

    user_id: str
    body: CommentBody
    created_at: datetime.datetime | Unset = UNSET
    metadata: CommentMetadata | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        body = self.body.to_dict()

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "userId": user_id,
                "body": body,
            }
        )
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.comment_body import CommentBody
        from ..models.comment_metadata import CommentMetadata

        d = dict(src_dict)
        user_id = d.pop("userId")

        body = CommentBody.from_dict(d.pop("body"))

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = isoparse(_created_at)

        _metadata = d.pop("metadata", UNSET)
        metadata: CommentMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = CommentMetadata.from_dict(_metadata)

        create_thread_request_body_comment = cls(
            user_id=user_id,
            body=body,
            created_at=created_at,
            metadata=metadata,
        )

        return create_thread_request_body_comment
