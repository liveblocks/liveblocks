from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.thread import Thread


@_attrs_define
class GetThreadsResponse:
    """
    Example:
        {'data': [{'type': 'thread', 'id': 'th_abc123', 'roomId': 'my-room-id', 'comments': [{'type': 'comment',
            'threadId': 'th_abc123', 'roomId': 'my-room-id', 'id': 'cm_abc123', 'userId': 'alice', 'createdAt':
            '2022-07-13T14:32:50.697Z', 'body': {'version': 1, 'content': []}, 'metadata': {}, 'reactions': [],
            'attachments': []}], 'createdAt': '2022-07-13T14:32:50.697Z', 'updatedAt': '2022-07-13T14:32:50.697Z',
            'metadata': {}, 'resolved': False}]}

    Attributes:
        data (list[Thread]):
    """

    data: list[Thread]

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.thread import Thread

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = Thread.from_dict(data_item_data)

            data.append(data_item)

        get_threads_response = cls(
            data=data,
        )

        return get_threads_response
