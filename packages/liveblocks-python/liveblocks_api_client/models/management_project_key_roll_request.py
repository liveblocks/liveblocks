from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.management_project_key_roll_request_expiration_in import ManagementProjectKeyRollRequestExpirationIn
from ..types import UNSET, Unset

T = TypeVar("T", bound="ManagementProjectKeyRollRequest")


@_attrs_define
class ManagementProjectKeyRollRequest:
    """
    Attributes:
        expiration_in (ManagementProjectKeyRollRequestExpirationIn | Unset):  Default:
            ManagementProjectKeyRollRequestExpirationIn.NOW.
    """

    expiration_in: ManagementProjectKeyRollRequestExpirationIn | Unset = ManagementProjectKeyRollRequestExpirationIn.NOW
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        expiration_in: str | Unset = UNSET
        if not isinstance(self.expiration_in, Unset):
            expiration_in = self.expiration_in.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if expiration_in is not UNSET:
            field_dict["expirationIn"] = expiration_in

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _expiration_in = d.pop("expirationIn", UNSET)
        expiration_in: ManagementProjectKeyRollRequestExpirationIn | Unset
        if isinstance(_expiration_in, Unset):
            expiration_in = UNSET
        else:
            expiration_in = ManagementProjectKeyRollRequestExpirationIn(_expiration_in)

        management_project_key_roll_request = cls(
            expiration_in=expiration_in,
        )

        management_project_key_roll_request.additional_properties = d
        return management_project_key_roll_request

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
