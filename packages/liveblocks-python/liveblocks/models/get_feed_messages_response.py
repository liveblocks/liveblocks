from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.feed_message import FeedMessage


@_attrs_define
class GetFeedMessagesResponse:
    """
    Example:
        {'nextCursor': 'eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9', 'data': [{'id': 'msg_xyz789', 'data': {'type': 'text',
            'content': 'Hello, world!'}, 'createdAt': 1660000988137, 'updatedAt': 1660000988137}]}

    Attributes:
        next_cursor (None | str): Pass as `cursor` to fetch the next page, or null when there are no more results.
        data (list[FeedMessage]):
    """

    next_cursor: None | str
    data: list[FeedMessage]

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
        from ..models.feed_message import FeedMessage

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = FeedMessage.from_dict(data_item_data)

            data.append(data_item)

        get_feed_messages_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_feed_messages_response
