from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.management_webhook_event import ManagementWebhookEvent
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.management_webhook_additional_headers import ManagementWebhookAdditionalHeaders
    from ..models.management_webhook_secret import ManagementWebhookSecret


T = TypeVar("T", bound="ManagementWebhook")


@_attrs_define
class ManagementWebhook:
    """
    Attributes:
        id (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        url (str):
        disabled (bool):
        subscribed_events (list[ManagementWebhookEvent]):
        secret (ManagementWebhookSecret):
        storage_updated_throttle_seconds (float):
        y_doc_updated_throttle_seconds (float):
        rate_limit (float | Unset):
        additional_headers (ManagementWebhookAdditionalHeaders | Unset):
    """

    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    url: str
    disabled: bool
    subscribed_events: list[ManagementWebhookEvent]
    secret: ManagementWebhookSecret
    storage_updated_throttle_seconds: float
    y_doc_updated_throttle_seconds: float
    rate_limit: float | Unset = UNSET
    additional_headers: ManagementWebhookAdditionalHeaders | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        url = self.url

        disabled = self.disabled

        subscribed_events = []
        for subscribed_events_item_data in self.subscribed_events:
            subscribed_events_item = subscribed_events_item_data.value
            subscribed_events.append(subscribed_events_item)

        secret = self.secret.to_dict()

        storage_updated_throttle_seconds = self.storage_updated_throttle_seconds

        y_doc_updated_throttle_seconds = self.y_doc_updated_throttle_seconds

        rate_limit = self.rate_limit

        additional_headers: dict[str, Any] | Unset = UNSET
        if not isinstance(self.additional_headers, Unset):
            additional_headers = self.additional_headers.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "url": url,
                "disabled": disabled,
                "subscribedEvents": subscribed_events,
                "secret": secret,
                "storageUpdatedThrottleSeconds": storage_updated_throttle_seconds,
                "yDocUpdatedThrottleSeconds": y_doc_updated_throttle_seconds,
            }
        )
        if rate_limit is not UNSET:
            field_dict["rateLimit"] = rate_limit
        if additional_headers is not UNSET:
            field_dict["additionalHeaders"] = additional_headers

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.management_webhook_additional_headers import ManagementWebhookAdditionalHeaders
        from ..models.management_webhook_secret import ManagementWebhookSecret

        d = dict(src_dict)
        id = d.pop("id")

        created_at = isoparse(d.pop("createdAt"))

        updated_at = isoparse(d.pop("updatedAt"))

        url = d.pop("url")

        disabled = d.pop("disabled")

        subscribed_events = []
        _subscribed_events = d.pop("subscribedEvents")
        for subscribed_events_item_data in _subscribed_events:
            subscribed_events_item = ManagementWebhookEvent(subscribed_events_item_data)

            subscribed_events.append(subscribed_events_item)

        secret = ManagementWebhookSecret.from_dict(d.pop("secret"))

        storage_updated_throttle_seconds = d.pop("storageUpdatedThrottleSeconds")

        y_doc_updated_throttle_seconds = d.pop("yDocUpdatedThrottleSeconds")

        rate_limit = d.pop("rateLimit", UNSET)

        _additional_headers = d.pop("additionalHeaders", UNSET)
        additional_headers: ManagementWebhookAdditionalHeaders | Unset
        if isinstance(_additional_headers, Unset):
            additional_headers = UNSET
        else:
            additional_headers = ManagementWebhookAdditionalHeaders.from_dict(_additional_headers)

        management_webhook = cls(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            url=url,
            disabled=disabled,
            subscribed_events=subscribed_events,
            secret=secret,
            storage_updated_throttle_seconds=storage_updated_throttle_seconds,
            y_doc_updated_throttle_seconds=y_doc_updated_throttle_seconds,
            rate_limit=rate_limit,
            additional_headers=additional_headers,
        )

        management_webhook.additional_properties = d
        return management_webhook

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
