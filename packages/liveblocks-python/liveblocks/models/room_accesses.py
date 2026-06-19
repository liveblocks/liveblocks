from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.room_permission_item import RoomPermissionItem


@_attrs_define
class RoomAccesses:
    """
    Example:
        {'alice': ['*:write'], 'bob': ['*:read']}

    """

    additional_properties: dict[str, list[RoomPermissionItem]] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():
            field_dict[prop_name] = []
            for additional_property_item_data in prop:
                additional_property_item = additional_property_item_data.value
                field_dict[prop_name].append(additional_property_item)

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        room_accesses = cls()

        additional_properties = {}
        for prop_name, prop_dict in d.items():
            additional_property = []
            _additional_property = prop_dict
            for additional_property_item_data in _additional_property:
                additional_property_item = RoomPermissionItem(additional_property_item_data)

                additional_property.append(additional_property_item)

            additional_properties[prop_name] = additional_property

        room_accesses.additional_properties = additional_properties
        return room_accesses

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> list[RoomPermissionItem]:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: list[RoomPermissionItem]) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
