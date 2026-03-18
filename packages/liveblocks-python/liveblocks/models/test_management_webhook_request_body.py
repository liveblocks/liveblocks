from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.management_webhook_event import ManagementWebhookEvent


@_attrs_define
class TestManagementWebhookRequestBody:
    """
    Example:
        {'subscribedEvent': 'storageUpdated'}

    Attributes:
        subscribed_event (ManagementWebhookEvent):  Example: storageUpdated.
    """

    subscribed_event: ManagementWebhookEvent
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        subscribed_event = self.subscribed_event.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "subscribedEvent": subscribed_event,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        subscribed_event = ManagementWebhookEvent(d.pop("subscribedEvent"))

        test_management_webhook_request_body = cls(
            subscribed_event=subscribed_event,
        )

        test_management_webhook_request_body.additional_properties = d
        return test_management_webhook_request_body

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
