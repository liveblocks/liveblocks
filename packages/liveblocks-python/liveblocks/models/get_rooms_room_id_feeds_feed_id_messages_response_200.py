from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.feed_message import FeedMessage


@_attrs_define
class GetRoomsRoomIdFeedsFeedIdMessagesResponse200:
    """
    Attributes:
        data (list[FeedMessage] | Unset):
        next_cursor (None | str | Unset): Pass as `cursor` to fetch the next page, or null when there are no more
            results.
    """

    data: list[FeedMessage] | Unset = UNSET
    next_cursor: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item = data_item_data.to_dict()
                data.append(data_item)

        next_cursor: None | str | Unset
        if isinstance(self.next_cursor, Unset):
            next_cursor = UNSET
        else:
            next_cursor = self.next_cursor

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if data is not UNSET:
            field_dict["data"] = data
        if next_cursor is not UNSET:
            field_dict["nextCursor"] = next_cursor

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.feed_message import FeedMessage

        d = dict(src_dict)
        _data = d.pop("data", UNSET)
        data: list[FeedMessage] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:
                data_item = FeedMessage.from_dict(data_item_data)

                data.append(data_item)

        def _parse_next_cursor(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor", UNSET))

        get_rooms_room_id_feeds_feed_id_messages_response_200 = cls(
            data=data,
            next_cursor=next_cursor,
        )

        get_rooms_room_id_feeds_feed_id_messages_response_200.additional_properties = d
        return get_rooms_room_id_feeds_feed_id_messages_response_200

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
