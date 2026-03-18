from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.management_webhook_event import ManagementWebhookEvent
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_management_webhook_request_body_additional_headers import (
        CreateManagementWebhookRequestBodyAdditionalHeaders,
    )


@_attrs_define
class CreateManagementWebhookRequestBody:
    """
    Example:
        {'url': 'https://example.com/webhooks', 'subscribedEvents': ['storageUpdated', 'userEntered'], 'rateLimit': 100,
            'storageUpdatedThrottleSeconds': 10, 'yDocUpdatedThrottleSeconds': 10}

    Attributes:
        url (str):
        subscribed_events (list[ManagementWebhookEvent]):
        rate_limit (int | Unset):
        additional_headers (CreateManagementWebhookRequestBodyAdditionalHeaders | Unset):
        storage_updated_throttle_seconds (int | Unset):
        y_doc_updated_throttle_seconds (int | Unset):
    """

    url: str
    subscribed_events: list[ManagementWebhookEvent]
    rate_limit: int | Unset = UNSET
    additional_headers: CreateManagementWebhookRequestBodyAdditionalHeaders | Unset = UNSET
    storage_updated_throttle_seconds: int | Unset = UNSET
    y_doc_updated_throttle_seconds: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        url = self.url

        subscribed_events = []
        for subscribed_events_item_data in self.subscribed_events:
            subscribed_events_item = subscribed_events_item_data.value
            subscribed_events.append(subscribed_events_item)

        rate_limit = self.rate_limit

        additional_headers: dict[str, Any] | Unset = UNSET
        if not isinstance(self.additional_headers, Unset):
            additional_headers = self.additional_headers.to_dict()

        storage_updated_throttle_seconds = self.storage_updated_throttle_seconds

        y_doc_updated_throttle_seconds = self.y_doc_updated_throttle_seconds

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "url": url,
                "subscribedEvents": subscribed_events,
            }
        )
        if rate_limit is not UNSET:
            field_dict["rateLimit"] = rate_limit
        if additional_headers is not UNSET:
            field_dict["additionalHeaders"] = additional_headers
        if storage_updated_throttle_seconds is not UNSET:
            field_dict["storageUpdatedThrottleSeconds"] = storage_updated_throttle_seconds
        if y_doc_updated_throttle_seconds is not UNSET:
            field_dict["yDocUpdatedThrottleSeconds"] = y_doc_updated_throttle_seconds

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.create_management_webhook_request_body_additional_headers import (
            CreateManagementWebhookRequestBodyAdditionalHeaders,
        )

        d = dict(src_dict)
        url = d.pop("url")

        subscribed_events = []
        _subscribed_events = d.pop("subscribedEvents")
        for subscribed_events_item_data in _subscribed_events:
            subscribed_events_item = ManagementWebhookEvent(subscribed_events_item_data)

            subscribed_events.append(subscribed_events_item)

        rate_limit = d.pop("rateLimit", UNSET)

        _additional_headers = d.pop("additionalHeaders", UNSET)
        additional_headers: CreateManagementWebhookRequestBodyAdditionalHeaders | Unset
        if isinstance(_additional_headers, Unset):
            additional_headers = UNSET
        else:
            additional_headers = CreateManagementWebhookRequestBodyAdditionalHeaders.from_dict(_additional_headers)

        storage_updated_throttle_seconds = d.pop("storageUpdatedThrottleSeconds", UNSET)

        y_doc_updated_throttle_seconds = d.pop("yDocUpdatedThrottleSeconds", UNSET)

        create_management_webhook_request_body = cls(
            url=url,
            subscribed_events=subscribed_events,
            rate_limit=rate_limit,
            additional_headers=additional_headers,
            storage_updated_throttle_seconds=storage_updated_throttle_seconds,
            y_doc_updated_throttle_seconds=y_doc_updated_throttle_seconds,
        )

        create_management_webhook_request_body.additional_properties = d
        return create_management_webhook_request_body

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
