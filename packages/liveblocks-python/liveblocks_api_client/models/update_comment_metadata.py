from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_comment_metadata_metadata import UpdateCommentMetadataMetadata


T = TypeVar("T", bound="UpdateCommentMetadata")


@_attrs_define
class UpdateCommentMetadata:
    """
    Attributes:
        metadata (UpdateCommentMetadataMetadata):
        user_id (str):
        updated_at (datetime.datetime | Unset):
    """

    metadata: UpdateCommentMetadataMetadata
    user_id: str
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        metadata = self.metadata.to_dict()

        user_id = self.user_id

        updated_at: str | Unset = UNSET
        if not isinstance(self.updated_at, Unset):
            updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "metadata": metadata,
                "userId": user_id,
            }
        )
        if updated_at is not UNSET:
            field_dict["updatedAt"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.update_comment_metadata_metadata import UpdateCommentMetadataMetadata

        d = dict(src_dict)
        metadata = UpdateCommentMetadataMetadata.from_dict(d.pop("metadata"))

        user_id = d.pop("userId")

        _updated_at = d.pop("updatedAt", UNSET)
        updated_at: datetime.datetime | Unset
        if isinstance(_updated_at, Unset):
            updated_at = UNSET
        else:
            updated_at = isoparse(_updated_at)

        update_comment_metadata = cls(
            metadata=metadata,
            user_id=user_id,
            updated_at=updated_at,
        )

        update_comment_metadata.additional_properties = d
        return update_comment_metadata

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
