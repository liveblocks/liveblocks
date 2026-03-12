from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self, cast

from attrs import define as _attrs_define


@_attrs_define
class DeleteManagementWebhookHeadersRequestBody:
    """
    Example:
        {'headers': ['X-Custom-Header', 'X-Another-Header']}

    Attributes:
        headers (list[str]):
    """

    headers: list[str]

    def to_dict(self) -> dict[str, Any]:
        headers = self.headers

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "headers": headers,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        headers = cast(list[str], d.pop("headers"))

        delete_management_webhook_headers_request_body = cls(
            headers=headers,
        )

        return delete_management_webhook_headers_request_body
