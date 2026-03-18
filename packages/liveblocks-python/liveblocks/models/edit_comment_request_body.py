from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.comment_body import CommentBody
    from ..models.comment_metadata import CommentMetadata


@_attrs_define
class EditCommentRequestBody:
    """
    Attributes:
        body (CommentBody):  Example: {'version': 1, 'content': [{'type': 'paragraph', 'children': [{'text': 'Hello '},
            {'text': 'world', 'bold': True}]}]}.
        edited_at (datetime.datetime | Unset):
        metadata (CommentMetadata | Unset): Custom metadata attached to a comment. Supports maximum 50 entries. Key
            length has a limit of 40 characters maximum. Value length has a limit of 4000 characters maximum for strings.
        attachment_ids (list[str] | Unset):
    """

    body: CommentBody
    edited_at: datetime.datetime | Unset = UNSET
    metadata: CommentMetadata | Unset = UNSET
    attachment_ids: list[str] | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        body = self.body.to_dict()

        edited_at: str | Unset = UNSET
        if not isinstance(self.edited_at, Unset):
            edited_at = self.edited_at.isoformat()

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        attachment_ids: list[str] | Unset = UNSET
        if not isinstance(self.attachment_ids, Unset):
            attachment_ids = self.attachment_ids

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "body": body,
            }
        )
        if edited_at is not UNSET:
            field_dict["editedAt"] = edited_at
        if metadata is not UNSET:
            field_dict["metadata"] = metadata
        if attachment_ids is not UNSET:
            field_dict["attachmentIds"] = attachment_ids

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.comment_body import CommentBody
        from ..models.comment_metadata import CommentMetadata

        d = dict(src_dict)
        body = CommentBody.from_dict(d.pop("body"))

        _edited_at = d.pop("editedAt", UNSET)
        edited_at: datetime.datetime | Unset
        if isinstance(_edited_at, Unset):
            edited_at = UNSET
        else:
            edited_at = isoparse(_edited_at)

        _metadata = d.pop("metadata", UNSET)
        metadata: CommentMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = CommentMetadata.from_dict(_metadata)

        attachment_ids = cast(list[str], d.pop("attachmentIds", UNSET))

        edit_comment_request_body = cls(
            body=body,
            edited_at=edited_at,
            metadata=metadata,
            attachment_ids=attachment_ids,
        )

        return edit_comment_request_body
