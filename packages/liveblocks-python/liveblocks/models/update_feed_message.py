from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_feed_message_data import UpdateFeedMessageData


@_attrs_define
class UpdateFeedMessage:
    """Request body for `PATCH /v2/rooms/{roomId}/feeds/{feedId}/messages/{messageId}`. Optional update time is sent as
    `timestamp` (milliseconds), not `updatedAt`.

        Attributes:
            data (UpdateFeedMessageData):
            timestamp (float | Unset): Optional. Unix timestamp in milliseconds to record as the update time. If omitted,
                the server uses the current time.
    """

    data: UpdateFeedMessageData
    timestamp: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = self.data.to_dict()

        timestamp = self.timestamp

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "data": data,
            }
        )
        if timestamp is not UNSET:
            field_dict["timestamp"] = timestamp

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.update_feed_message_data import UpdateFeedMessageData

        d = dict(src_dict)
        data = UpdateFeedMessageData.from_dict(d.pop("data"))

        timestamp = d.pop("timestamp", UNSET)

        update_feed_message = cls(
            data=data,
            timestamp=timestamp,
        )

        update_feed_message.additional_properties = d
        return update_feed_message

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
