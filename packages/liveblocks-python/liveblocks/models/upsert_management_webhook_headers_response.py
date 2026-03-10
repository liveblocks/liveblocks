from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.upsert_management_webhook_headers_response_headers import (
        UpsertManagementWebhookHeadersResponseHeaders,
    )


@_attrs_define
class UpsertManagementWebhookHeadersResponse:
    """
    Attributes:
        headers (UpsertManagementWebhookHeadersResponseHeaders):
    """

    headers: UpsertManagementWebhookHeadersResponseHeaders

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
        from ..models.upsert_management_webhook_headers_response_headers import (
            UpsertManagementWebhookHeadersResponseHeaders,
        )

        d = dict(src_dict)
        headers = UpsertManagementWebhookHeadersResponseHeaders.from_dict(d.pop("headers"))

        upsert_management_webhook_headers_response = cls(
            headers=headers,
        )

        return upsert_management_webhook_headers_response
