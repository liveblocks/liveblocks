from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.management_webhook_headers_response_headers import ManagementWebhookHeadersResponseHeaders


T = TypeVar("T", bound="ManagementWebhookHeadersResponse")


@_attrs_define
class ManagementWebhookHeadersResponse:
    """
    Attributes:
        headers (ManagementWebhookHeadersResponseHeaders):
    """

    headers: ManagementWebhookHeadersResponseHeaders
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        headers = self.headers.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "headers": headers,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.management_webhook_headers_response_headers import ManagementWebhookHeadersResponseHeaders

        d = dict(src_dict)
        headers = ManagementWebhookHeadersResponseHeaders.from_dict(d.pop("headers"))

        management_webhook_headers_response = cls(
            headers=headers,
        )

        management_webhook_headers_response.additional_properties = d
        return management_webhook_headers_response

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
