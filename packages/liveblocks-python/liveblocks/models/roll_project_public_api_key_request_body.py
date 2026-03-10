from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define

from ..models.roll_project_public_api_key_request_body_expiration_in import (
    RollProjectPublicApiKeyRequestBodyExpirationIn,
)
from ..types import UNSET, Unset


@_attrs_define
class RollProjectPublicApiKeyRequestBody:
    """
    Attributes:
        expiration_in (RollProjectPublicApiKeyRequestBodyExpirationIn | Unset):  Default:
            RollProjectPublicApiKeyRequestBodyExpirationIn.NOW.
    """

    expiration_in: RollProjectPublicApiKeyRequestBodyExpirationIn | Unset = (
        RollProjectPublicApiKeyRequestBodyExpirationIn.NOW
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
        expiration_in: RollProjectPublicApiKeyRequestBodyExpirationIn | Unset
        if isinstance(_expiration_in, Unset):
            expiration_in = UNSET
        else:
            expiration_in = RollProjectPublicApiKeyRequestBodyExpirationIn(_expiration_in)

        roll_project_public_api_key_request_body = cls(
            expiration_in=expiration_in,
        )

        return roll_project_public_api_key_request_body
