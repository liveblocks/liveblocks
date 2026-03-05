from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

T = TypeVar("T", bound="ManagementProjectPublicKey")


@_attrs_define
class ManagementProjectPublicKey:
    """
    Attributes:
        activated (bool):
        created_at (datetime.datetime):
        value (str):
    """

    activated: bool
    created_at: datetime.datetime
    value: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        activated = self.activated

        created_at = self.created_at.isoformat()

        value = self.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "activated": activated,
                "createdAt": created_at,
                "value": value,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        activated = d.pop("activated")

        created_at = isoparse(d.pop("createdAt"))

        value = d.pop("value")

        management_project_public_key = cls(
            activated=activated,
            created_at=created_at,
            value=value,
        )

        management_project_public_key.additional_properties = d
        return management_project_public_key

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
