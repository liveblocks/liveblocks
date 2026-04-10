from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.room import Room


@_attrs_define
class GetRoomsResponse:
    """
    Example:
        {'nextCursor': 'eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9', 'data': [{'type': 'room', 'id': 'my-room-id',
            'lastConnectionAt': '2022-08-08T23:23:15.281Z', 'createdAt': '2022-08-08T23:23:15.281Z', 'organizationId':
            'org_123456789', 'metadata': {'color': 'blue'}, 'defaultAccesses': ['room:write'], 'groupsAccesses': {'product':
            ['room:write']}, 'usersAccesses': {'alice': ['room:write']}}]}

    Attributes:
        next_cursor (None | str):
        data (list[Room]):
    """

    next_cursor: None | str
    data: list[Room]

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
        from ..models.room import Room

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = Room.from_dict(data_item_data)

            data.append(data_item)

        get_rooms_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_rooms_response
