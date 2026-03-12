from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.management_webhook import ManagementWebhook


@_attrs_define
class GetManagementWebhooksResponse:
    """
    Example:
        {'data': [{'id': 'wh_abc123', 'createdAt': '2024-09-03T12:34:56.000Z', 'updatedAt': '2024-09-03T12:34:56.000Z',
            'url': 'https://example.com/webhooks', 'disabled': False, 'subscribedEvents': ['storageUpdated', 'userEntered'],
            'secret': {'value': 'whsec_abc123'}, 'storageUpdatedThrottleSeconds': 10, 'yDocUpdatedThrottleSeconds': 10}],
            'nextCursor': None}

    Attributes:
        next_cursor (None | str):
        data (list[ManagementWebhook] | Unset):
    """

    next_cursor: None | str
    data: list[ManagementWebhook] | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        next_cursor: None | str
        next_cursor = self.next_cursor

        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item = data_item_data.to_dict()
                data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "nextCursor": next_cursor,
            }
        )
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_webhook import ManagementWebhook

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        _data = d.pop("data", UNSET)
        data: list[ManagementWebhook] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:
                data_item = ManagementWebhook.from_dict(data_item_data)

                data.append(data_item)

        get_management_webhooks_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_management_webhooks_response
