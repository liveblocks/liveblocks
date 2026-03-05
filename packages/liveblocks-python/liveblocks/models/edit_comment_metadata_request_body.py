from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.edit_comment_metadata_request_body_metadata import EditCommentMetadataRequestBodyMetadata


T = TypeVar("T", bound="EditCommentMetadataRequestBody")


@_attrs_define
class EditCommentMetadataRequestBody:
    """
    Attributes:
        metadata (EditCommentMetadataRequestBodyMetadata):
        user_id (str):
        updated_at (datetime.datetime | Unset):
    """

    metadata: EditCommentMetadataRequestBodyMetadata
    user_id: str
    updated_at: datetime.datetime | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        metadata = self.metadata.to_dict()

        user_id = self.user_id

        updated_at: str | Unset = UNSET
        if not isinstance(self.updated_at, Unset):
            updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}

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
        from ..models.edit_comment_metadata_request_body_metadata import EditCommentMetadataRequestBodyMetadata

        d = dict(src_dict)
        metadata = EditCommentMetadataRequestBodyMetadata.from_dict(d.pop("metadata"))

        user_id = d.pop("userId")

        _updated_at = d.pop("updatedAt", UNSET)
        updated_at: datetime.datetime | Unset
        if isinstance(_updated_at, Unset):
            updated_at = UNSET
        else:
            updated_at = isoparse(_updated_at)

        edit_comment_metadata_request_body = cls(
            metadata=metadata,
            user_id=user_id,
            updated_at=updated_at,
        )

        return edit_comment_metadata_request_body
