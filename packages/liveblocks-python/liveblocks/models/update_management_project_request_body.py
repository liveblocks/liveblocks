from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset


@_attrs_define
class UpdateManagementProjectRequestBody:
    """
    Attributes:
        name (str | Unset):
        version_creation_timeout (bool | int | Unset): False to disable timeout or number of seconds between 30 and 300.
    """

    name: str | Unset = UNSET
    version_creation_timeout: bool | int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        version_creation_timeout: bool | int | Unset
        if isinstance(self.version_creation_timeout, Unset):
            version_creation_timeout = UNSET
        else:
            version_creation_timeout = self.version_creation_timeout

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if version_creation_timeout is not UNSET:
            field_dict["versionCreationTimeout"] = version_creation_timeout

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        name = d.pop("name", UNSET)

        def _parse_version_creation_timeout(data: object) -> bool | int | Unset:
            if isinstance(data, Unset):
                return data
            return cast(bool | int | Unset, data)

        version_creation_timeout = _parse_version_creation_timeout(d.pop("versionCreationTimeout", UNSET))

        update_management_project_request_body = cls(
            name=name,
            version_creation_timeout=version_creation_timeout,
        )

        update_management_project_request_body.additional_properties = d
        return update_management_project_request_body

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
