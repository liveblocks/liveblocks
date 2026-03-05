from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.management_webhook_event import ManagementWebhookEvent
from ..types import UNSET, Unset

T = TypeVar("T", bound="UpdateManagementWebhookRequestBody")


@_attrs_define
class UpdateManagementWebhookRequestBody:
    """
    Attributes:
        url (str | Unset):
        subscribed_events (list[ManagementWebhookEvent] | Unset):
        rate_limit (float | Unset):
        storage_updated_throttle_seconds (float | Unset):
        y_doc_updated_throttle_seconds (float | Unset):
        disabled (bool | Unset):
    """

    url: str | Unset = UNSET
    subscribed_events: list[ManagementWebhookEvent] | Unset = UNSET
    rate_limit: float | Unset = UNSET
    storage_updated_throttle_seconds: float | Unset = UNSET
    y_doc_updated_throttle_seconds: float | Unset = UNSET
    disabled: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        url = self.url

        subscribed_events: list[str] | Unset = UNSET
        if not isinstance(self.subscribed_events, Unset):
            subscribed_events = []
            for subscribed_events_item_data in self.subscribed_events:
                subscribed_events_item = subscribed_events_item_data.value
                subscribed_events.append(subscribed_events_item)

        rate_limit = self.rate_limit

        storage_updated_throttle_seconds = self.storage_updated_throttle_seconds

        y_doc_updated_throttle_seconds = self.y_doc_updated_throttle_seconds

        disabled = self.disabled

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if url is not UNSET:
            field_dict["url"] = url
        if subscribed_events is not UNSET:
            field_dict["subscribedEvents"] = subscribed_events
        if rate_limit is not UNSET:
            field_dict["rateLimit"] = rate_limit
        if storage_updated_throttle_seconds is not UNSET:
            field_dict["storageUpdatedThrottleSeconds"] = storage_updated_throttle_seconds
        if y_doc_updated_throttle_seconds is not UNSET:
            field_dict["yDocUpdatedThrottleSeconds"] = y_doc_updated_throttle_seconds
        if disabled is not UNSET:
            field_dict["disabled"] = disabled

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        url = d.pop("url", UNSET)

        _subscribed_events = d.pop("subscribedEvents", UNSET)
        subscribed_events: list[ManagementWebhookEvent] | Unset = UNSET
        if _subscribed_events is not UNSET:
            subscribed_events = []
            for subscribed_events_item_data in _subscribed_events:
                subscribed_events_item = ManagementWebhookEvent(subscribed_events_item_data)

                subscribed_events.append(subscribed_events_item)

        rate_limit = d.pop("rateLimit", UNSET)

        storage_updated_throttle_seconds = d.pop("storageUpdatedThrottleSeconds", UNSET)

        y_doc_updated_throttle_seconds = d.pop("yDocUpdatedThrottleSeconds", UNSET)

        disabled = d.pop("disabled", UNSET)

        update_management_webhook_request_body = cls(
            url=url,
            subscribed_events=subscribed_events,
            rate_limit=rate_limit,
            storage_updated_throttle_seconds=storage_updated_throttle_seconds,
            y_doc_updated_throttle_seconds=y_doc_updated_throttle_seconds,
            disabled=disabled,
        )

        update_management_webhook_request_body.additional_properties = d
        return update_management_webhook_request_body

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
