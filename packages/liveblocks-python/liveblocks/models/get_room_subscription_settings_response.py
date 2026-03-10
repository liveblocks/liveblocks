from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.user_room_subscription_settings import UserRoomSubscriptionSettings


@_attrs_define
class GetRoomSubscriptionSettingsResponse:
    """
    Attributes:
        next_cursor (None | str): A cursor to use for pagination. Pass this value as `startingAfter` to get the next
            page of results. `null` if there are no more results.
        data (list[UserRoomSubscriptionSettings]):
    """

    next_cursor: None | str
    data: list[UserRoomSubscriptionSettings]

    def to_dict(self) -> dict[str, Any]:
        next_cursor: None | str
        next_cursor = self.next_cursor

        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "nextCursor": next_cursor,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.user_room_subscription_settings import UserRoomSubscriptionSettings

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = UserRoomSubscriptionSettings.from_dict(data_item_data)

            data.append(data_item)

        get_room_subscription_settings_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_room_subscription_settings_response
