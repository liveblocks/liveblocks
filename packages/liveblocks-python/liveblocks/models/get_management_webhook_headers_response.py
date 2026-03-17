from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_webhook_additional_headers import ManagementWebhookAdditionalHeaders


@_attrs_define
class GetManagementWebhookHeadersResponse:
    """
    Example:
        {'headers': {'X-Custom-Header': 'value'}}

    Attributes:
        headers (ManagementWebhookAdditionalHeaders):  Example: {'X-Custom-Header': 'value'}.
    """

    headers: ManagementWebhookAdditionalHeaders

    def to_dict(self) -> dict[str, Any]:
        headers = self.headers.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "headers": headers,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_webhook_additional_headers import ManagementWebhookAdditionalHeaders

        d = dict(src_dict)
        headers = ManagementWebhookAdditionalHeaders.from_dict(d.pop("headers"))

        get_management_webhook_headers_response = cls(
            headers=headers,
        )

        return get_management_webhook_headers_response
