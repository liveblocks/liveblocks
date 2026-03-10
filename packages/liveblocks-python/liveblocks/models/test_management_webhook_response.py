from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.test_management_webhook_response_message import TestManagementWebhookResponseMessage


@_attrs_define
class TestManagementWebhookResponse:
    """
    Attributes:
        message (TestManagementWebhookResponseMessage):
    """

    message: TestManagementWebhookResponseMessage

    def to_dict(self) -> dict[str, Any]:
        message = self.message.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "message": message,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.test_management_webhook_response_message import TestManagementWebhookResponseMessage

        d = dict(src_dict)
        message = TestManagementWebhookResponseMessage.from_dict(d.pop("message"))

        test_management_webhook_response = cls(
            message=message,
        )

        return test_management_webhook_response
