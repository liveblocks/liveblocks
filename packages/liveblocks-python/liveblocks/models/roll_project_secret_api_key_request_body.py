from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define

from ..models.roll_project_secret_api_key_request_body_expiration_in import (
    RollProjectSecretApiKeyRequestBodyExpirationIn,
)
from ..types import UNSET, Unset


@_attrs_define
class RollProjectSecretApiKeyRequestBody:
    """
    Example:
        {'expirationIn': '3 days'}

    Attributes:
        expiration_in (RollProjectSecretApiKeyRequestBodyExpirationIn | Unset):  Default:
            RollProjectSecretApiKeyRequestBodyExpirationIn.NOW.
    """

    expiration_in: RollProjectSecretApiKeyRequestBodyExpirationIn | Unset = (
        RollProjectSecretApiKeyRequestBodyExpirationIn.NOW
    )

    def to_dict(self) -> dict[str, Any]:
        expiration_in: str | Unset = UNSET
        if not isinstance(self.expiration_in, Unset):
            expiration_in = self.expiration_in.value

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if expiration_in is not UNSET:
            field_dict["expirationIn"] = expiration_in

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        _expiration_in = d.pop("expirationIn", UNSET)
        expiration_in: RollProjectSecretApiKeyRequestBodyExpirationIn | Unset
        if isinstance(_expiration_in, Unset):
            expiration_in = UNSET
        else:
            expiration_in = RollProjectSecretApiKeyRequestBodyExpirationIn(_expiration_in)

        roll_project_secret_api_key_request_body = cls(
            expiration_in=expiration_in,
        )

        return roll_project_secret_api_key_request_body
