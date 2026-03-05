from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_webhook import ManagementWebhook


T = TypeVar("T", bound="UpdateManagementWebhookResponse")


@_attrs_define
class UpdateManagementWebhookResponse:
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
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.management_webhook import ManagementWebhook

        d = dict(src_dict)
        webhook = ManagementWebhook.from_dict(d.pop("webhook"))

        update_management_webhook_response = cls(
            webhook=webhook,
        )

        return update_management_webhook_response
