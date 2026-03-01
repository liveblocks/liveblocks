from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.management_project_type import ManagementProjectType
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateManagementProject")


@_attrs_define
class CreateManagementProject:
    """
    Attributes:
        type_ (ManagementProjectType):
        name (str | Unset):
        version_creation_timeout (bool | float | Unset): False to disable timeout or number of seconds between 30 and
            300.
    """

    type_: ManagementProjectType
    name: str | Unset = UNSET
    version_creation_timeout: bool | float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        name = self.name

        version_creation_timeout: bool | float | Unset
        if isinstance(self.version_creation_timeout, Unset):
            version_creation_timeout = UNSET
        else:
            version_creation_timeout = self.version_creation_timeout

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
            }
        )
        if name is not UNSET:
            field_dict["name"] = name
        if version_creation_timeout is not UNSET:
            field_dict["versionCreationTimeout"] = version_creation_timeout

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        type_ = ManagementProjectType(d.pop("type"))

        name = d.pop("name", UNSET)

        def _parse_version_creation_timeout(data: object) -> bool | float | Unset:
            if isinstance(data, Unset):
                return data
            return cast(bool | float | Unset, data)

        version_creation_timeout = _parse_version_creation_timeout(d.pop("versionCreationTimeout", UNSET))

        create_management_project = cls(
            type_=type_,
            name=name,
            version_creation_timeout=version_creation_timeout,
        )

        create_management_project.additional_properties = d
        return create_management_project

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
