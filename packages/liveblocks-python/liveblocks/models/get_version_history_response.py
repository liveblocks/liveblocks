from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.history_version import HistoryVersion


@_attrs_define
class GetVersionHistoryResponse:
    """
    Example:
        {'data': [{'id': 'vh_abc123', 'createdAt': '2024-10-15T10:30:00.000Z', 'authors': [{'id': 'user-123'}]}],
            'nextCursor': 'eyJjcmVhdGVkQXQiOiIyMDI0LTEwLTE1VDEwOjMwOjAwLjAwMFoifQ=='}

    Attributes:
        next_cursor (None | str): Cursor for pagination to get the next page of results
        data (list[HistoryVersion]):
    """

    next_cursor: None | str
    data: list[HistoryVersion]

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
        from ..models.history_version import HistoryVersion

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = HistoryVersion.from_dict(data_item_data)

            data.append(data_item)

        get_version_history_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_version_history_response
