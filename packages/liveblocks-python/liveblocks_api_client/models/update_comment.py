from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.comment_body import CommentBody
    from ..models.comment_metadata import CommentMetadata


T = TypeVar("T", bound="UpdateComment")


@_attrs_define
class UpdateComment:
    """
    Attributes:
        body (CommentBody):
        edited_at (datetime.datetime | Unset):
        metadata (CommentMetadata | Unset):
    """

    body: CommentBody
    edited_at: datetime.datetime | Unset = UNSET
    metadata: CommentMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        body = self.body.to_dict()

        edited_at: str | Unset = UNSET
        if not isinstance(self.edited_at, Unset):
            edited_at = self.edited_at.isoformat()

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "body": body,
            }
        )
        if edited_at is not UNSET:
            field_dict["editedAt"] = edited_at
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
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

        update_comment = cls(
            body=body,
            edited_at=edited_at,
            metadata=metadata,
        )

        update_comment.additional_properties = d
        return update_comment

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
