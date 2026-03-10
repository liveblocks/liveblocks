from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_project_public_key import ManagementProjectPublicKey


@_attrs_define
class RollProjectPublicApiKeyResponse:
    """
    Attributes:
        public_key (ManagementProjectPublicKey):
    """

    public_key: ManagementProjectPublicKey

    def to_dict(self) -> dict[str, Any]:
        public_key = self.public_key.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "publicKey": public_key,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_project_public_key import ManagementProjectPublicKey

        d = dict(src_dict)
        public_key = ManagementProjectPublicKey.from_dict(d.pop("publicKey"))

        roll_project_public_api_key_response = cls(
            public_key=public_key,
        )

        return roll_project_public_api_key_response
