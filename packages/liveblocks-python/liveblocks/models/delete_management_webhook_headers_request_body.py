from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

T = TypeVar("T", bound="DeleteManagementWebhookHeadersRequestBody")


@_attrs_define
class DeleteManagementWebhookHeadersRequestBody:
    """
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
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        headers = cast(list[str], d.pop("headers"))

        delete_management_webhook_headers_request_body = cls(
            headers=headers,
        )

        return delete_management_webhook_headers_request_body
