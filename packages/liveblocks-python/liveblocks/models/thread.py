from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

if TYPE_CHECKING:
    from ..models.comment import Comment
    from ..models.thread_metadata import ThreadMetadata


@_attrs_define
class Thread:
    """
    Attributes:
        type_ (Literal['thread']):
        id (str):
        room_id (str):
        comments (list[Comment]):
        created_at (datetime.datetime):
        metadata (ThreadMetadata):
        resolved (bool):
        updated_at (datetime.datetime):
    """

    type_: Literal["thread"]
    id: str
    room_id: str
    comments: list[Comment]
    created_at: datetime.datetime
    metadata: ThreadMetadata
    resolved: bool
    updated_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        id = self.id

        room_id = self.room_id

        comments = []
        for comments_item_data in self.comments:
            comments_item = comments_item_data.to_dict()
            comments.append(comments_item)

        created_at = self.created_at.isoformat()

        metadata = self.metadata.to_dict()

        resolved = self.resolved

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "id": id,
                "roomId": room_id,
                "comments": comments,
                "createdAt": created_at,
                "metadata": metadata,
                "resolved": resolved,
                "updatedAt": updated_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.comment import Comment
        from ..models.thread_metadata import ThreadMetadata

        d = dict(src_dict)
        type_ = cast(Literal["thread"], d.pop("type"))
        if type_ != "thread":
            raise ValueError(f"type must match const 'thread', got '{type_}'")

        id = d.pop("id")

        room_id = d.pop("roomId")

        comments = []
        _comments = d.pop("comments")
        for comments_item_data in _comments:
            comments_item = Comment.from_dict(comments_item_data)

            comments.append(comments_item)

        created_at = isoparse(d.pop("createdAt"))

        metadata = ThreadMetadata.from_dict(d.pop("metadata"))

        resolved = d.pop("resolved")

        updated_at = isoparse(d.pop("updatedAt"))

        thread = cls(
            type_=type_,
            id=id,
            room_id=room_id,
            comments=comments,
            created_at=created_at,
            metadata=metadata,
            resolved=resolved,
            updated_at=updated_at,
        )

        thread.additional_properties = d
        return thread

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
