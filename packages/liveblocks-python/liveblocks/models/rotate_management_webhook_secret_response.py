from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.management_webhook_secret import ManagementWebhookSecret


@_attrs_define
class RotateManagementWebhookSecretResponse:
    """
    Example:
        {'secret': {'value': 'whsec_new_abc123'}, 'message': 'Previous secret remains valid for 24 hours.'}

    Attributes:
        secret (ManagementWebhookSecret):  Example: {'value': 'whsec_abc123'}.
        message (str):
    """

    secret: ManagementWebhookSecret
    message: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        secret = self.secret.to_dict()

        message = self.message

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "secret": secret,
                "message": message,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_webhook_secret import ManagementWebhookSecret

        d = dict(src_dict)
        secret = ManagementWebhookSecret.from_dict(d.pop("secret"))

        message = d.pop("message")

        rotate_management_webhook_secret_response = cls(
            secret=secret,
            message=message,
        )

        rotate_management_webhook_secret_response.additional_properties = d
        return rotate_management_webhook_secret_response

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
