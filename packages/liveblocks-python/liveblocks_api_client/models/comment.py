from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.comment_body import CommentBody
    from ..models.comment_metadata import CommentMetadata


T = TypeVar("T", bound="Comment")


@_attrs_define
class Comment:
    """
    Attributes:
        type_ (Literal['comment']):  Default: 'comment'.
        thread_id (str):
        room_id (str):
        id (str):
        user_id (str):
        created_at (datetime.datetime):
        edited_at (datetime.datetime | Unset):
        deleted_at (datetime.datetime | Unset):
        body (CommentBody | Unset):
        metadata (CommentMetadata | Unset):
    """

    thread_id: str
    room_id: str
    id: str
    user_id: str
    created_at: datetime.datetime
    type_: Literal["comment"] = "comment"
    edited_at: datetime.datetime | Unset = UNSET
    deleted_at: datetime.datetime | Unset = UNSET
    body: CommentBody | Unset = UNSET
    metadata: CommentMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        thread_id = self.thread_id

        room_id = self.room_id

        id = self.id

        user_id = self.user_id

        created_at = self.created_at.isoformat()

        edited_at: str | Unset = UNSET
        if not isinstance(self.edited_at, Unset):
            edited_at = self.edited_at.isoformat()

        deleted_at: str | Unset = UNSET
        if not isinstance(self.deleted_at, Unset):
            deleted_at = self.deleted_at.isoformat()

        body: dict[str, Any] | Unset = UNSET
        if not isinstance(self.body, Unset):
            body = self.body.to_dict()

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "threadId": thread_id,
                "roomId": room_id,
                "id": id,
                "userId": user_id,
                "createdAt": created_at,
            }
        )
        if edited_at is not UNSET:
            field_dict["editedAt"] = edited_at
        if deleted_at is not UNSET:
            field_dict["deletedAt"] = deleted_at
        if body is not UNSET:
            field_dict["body"] = body
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.comment_body import CommentBody
        from ..models.comment_metadata import CommentMetadata

        d = dict(src_dict)
        type_ = cast(Literal["comment"], d.pop("type"))
        if type_ != "comment":
            raise ValueError(f"type must match const 'comment', got '{type_}'")

        thread_id = d.pop("threadId")

        room_id = d.pop("roomId")

        id = d.pop("id")

        user_id = d.pop("userId")

        created_at = isoparse(d.pop("createdAt"))

        _edited_at = d.pop("editedAt", UNSET)
        edited_at: datetime.datetime | Unset
        if isinstance(_edited_at, Unset):
            edited_at = UNSET
        else:
            edited_at = isoparse(_edited_at)

        _deleted_at = d.pop("deletedAt", UNSET)
        deleted_at: datetime.datetime | Unset
        if isinstance(_deleted_at, Unset):
            deleted_at = UNSET
        else:
            deleted_at = isoparse(_deleted_at)

        _body = d.pop("body", UNSET)
        body: CommentBody | Unset
        if isinstance(_body, Unset):
            body = UNSET
        else:
            body = CommentBody.from_dict(_body)

        _metadata = d.pop("metadata", UNSET)
        metadata: CommentMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = CommentMetadata.from_dict(_metadata)

        comment = cls(
            type_=type_,
            thread_id=thread_id,
            room_id=room_id,
            id=id,
            user_id=user_id,
            created_at=created_at,
            edited_at=edited_at,
            deleted_at=deleted_at,
            body=body,
            metadata=metadata,
        )

        comment.additional_properties = d
        return comment

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
