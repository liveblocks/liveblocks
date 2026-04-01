from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.feed_metadata import FeedMetadata


@_attrs_define
class Feed:
    """Feed objects returned by the API use `createdAt` and `updatedAt` (Unix time in milliseconds).

    Attributes:
        feed_id (str):
        metadata (FeedMetadata):
        created_at (float): Unix timestamp in milliseconds when the feed was created.
        updated_at (float): Unix timestamp in milliseconds when the feed was last updated.
    """

    feed_id: str
    metadata: FeedMetadata
    created_at: float
    updated_at: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        feed_id = self.feed_id

        metadata = self.metadata.to_dict()

        created_at = self.created_at

        updated_at = self.updated_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "feedId": feed_id,
                "metadata": metadata,
                "createdAt": created_at,
                "updatedAt": updated_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.feed_metadata import FeedMetadata

        d = dict(src_dict)
        feed_id = d.pop("feedId")

        metadata = FeedMetadata.from_dict(d.pop("metadata"))

        created_at = d.pop("createdAt")

        updated_at = d.pop("updatedAt")

        feed = cls(
            feed_id=feed_id,
            metadata=metadata,
            created_at=created_at,
            updated_at=updated_at,
        )

        feed.additional_properties = d
        return feed

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
