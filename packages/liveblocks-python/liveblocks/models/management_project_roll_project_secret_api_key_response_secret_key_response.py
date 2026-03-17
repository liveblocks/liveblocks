from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_project_secret_key import ManagementProjectSecretKey


@_attrs_define
class ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse:
    """
    Example:
        {'secretKey': {'createdAt': '2024-09-03T12:34:56.000Z', 'value': 'sk_dev_123'}}

    Attributes:
        secret_key (ManagementProjectSecretKey):  Example: {'createdAt': '2024-09-03T12:34:56.000Z', 'value':
            'sk_dev_123'}.
    """

    secret_key: ManagementProjectSecretKey

    def to_dict(self) -> dict[str, Any]:
        secret_key = self.secret_key.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "secretKey": secret_key,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_project_secret_key import ManagementProjectSecretKey

        d = dict(src_dict)
        secret_key = ManagementProjectSecretKey.from_dict(d.pop("secretKey"))

        management_project_roll_project_secret_api_key_response_secret_key_response = cls(
            secret_key=secret_key,
        )

        return management_project_roll_project_secret_api_key_response_secret_key_response
