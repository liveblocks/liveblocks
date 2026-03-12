from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse


@_attrs_define
class ManagementProjectSecretKey:
    """
    Example:
        {'createdAt': '2024-09-03T12:34:56.000Z', 'value': 'sk_dev_123'}

    Attributes:
        created_at (datetime.datetime):
        value (str):
    """

    created_at: datetime.datetime
    value: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        created_at = self.created_at.isoformat()

        value = self.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "createdAt": created_at,
                "value": value,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        created_at = isoparse(d.pop("createdAt"))

        value = d.pop("value")

        management_project_secret_key = cls(
            created_at=created_at,
            value=value,
        )

        management_project_secret_key.additional_properties = d
        return management_project_secret_key

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
