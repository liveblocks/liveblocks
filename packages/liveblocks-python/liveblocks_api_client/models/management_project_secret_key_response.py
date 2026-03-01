from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.management_project_secret_key import ManagementProjectSecretKey


T = TypeVar("T", bound="ManagementProjectSecretKeyResponse")


@_attrs_define
class ManagementProjectSecretKeyResponse:
    """
    Attributes:
        secret_key (ManagementProjectSecretKey):
    """

    secret_key: ManagementProjectSecretKey
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        secret_key = self.secret_key.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "secretKey": secret_key,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.management_project_secret_key import ManagementProjectSecretKey

        d = dict(src_dict)
        secret_key = ManagementProjectSecretKey.from_dict(d.pop("secretKey"))

        management_project_secret_key_response = cls(
            secret_key=secret_key,
        )

        management_project_secret_key_response.additional_properties = d
        return management_project_secret_key_response

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
