from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_webhook import ManagementWebhook


@_attrs_define
class CreateManagementWebhookResponse:
    """
    Attributes:
        webhook (ManagementWebhook):
    """

    webhook: ManagementWebhook

    def to_dict(self) -> dict[str, Any]:
        webhook = self.webhook.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "webhook": webhook,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_webhook import ManagementWebhook

        d = dict(src_dict)
        webhook = ManagementWebhook.from_dict(d.pop("webhook"))

        create_management_webhook_response = cls(
            webhook=webhook,
        )

        return create_management_webhook_response
