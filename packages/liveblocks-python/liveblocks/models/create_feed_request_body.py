from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_feed_request_body_metadata import CreateFeedRequestBodyMetadata


@_attrs_define
class CreateFeedRequestBody:
    """Request body for `POST /v2/rooms/{roomId}/feeds`. Optional creation time is sent as `timestamp` (milliseconds), not
    `createdAt`.

        Attributes:
            feed_id (str):
            metadata (CreateFeedRequestBodyMetadata | Unset):
            timestamp (float | Unset): Optional. Unix timestamp in milliseconds for the feed's creation time. If omitted,
                the server uses the current time.
    """

    feed_id: str
    metadata: CreateFeedRequestBodyMetadata | Unset = UNSET
    timestamp: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        feed_id = self.feed_id

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        timestamp = self.timestamp

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "feedId": feed_id,
            }
        )
        if metadata is not UNSET:
            field_dict["metadata"] = metadata
        if timestamp is not UNSET:
            field_dict["timestamp"] = timestamp

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.create_feed_request_body_metadata import CreateFeedRequestBodyMetadata

        d = dict(src_dict)
        feed_id = d.pop("feedId")

        _metadata = d.pop("metadata", UNSET)
        metadata: CreateFeedRequestBodyMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = CreateFeedRequestBodyMetadata.from_dict(_metadata)

        timestamp = d.pop("timestamp", UNSET)

        create_feed_request_body = cls(
            feed_id=feed_id,
            metadata=metadata,
            timestamp=timestamp,
        )

        create_feed_request_body.additional_properties = d
        return create_feed_request_body

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
