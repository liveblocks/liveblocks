from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_webhook import ManagementWebhook


@_attrs_define
class GetManagementWebhooksResponse:
    """
    Attributes:
        webhooks (list[ManagementWebhook]):
        next_cursor (None | str):
    """

    webhooks: list[ManagementWebhook]
    next_cursor: None | str

    def to_dict(self) -> dict[str, Any]:
        webhooks = []
        for webhooks_item_data in self.webhooks:
            webhooks_item = webhooks_item_data.to_dict()
            webhooks.append(webhooks_item)

        next_cursor: None | str
        next_cursor = self.next_cursor

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "webhooks": webhooks,
                "nextCursor": next_cursor,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_webhook import ManagementWebhook

        d = dict(src_dict)
        webhooks = []
        _webhooks = d.pop("webhooks")
        for webhooks_item_data in _webhooks:
            webhooks_item = ManagementWebhook.from_dict(webhooks_item_data)

            webhooks.append(webhooks_item)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        get_management_webhooks_response = cls(
            webhooks=webhooks,
            next_cursor=next_cursor,
        )

        return get_management_webhooks_response
