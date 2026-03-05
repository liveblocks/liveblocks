from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.update_room_request_body_groups_accesses_additional_property_type_0_item import (
    UpdateRoomRequestBodyGroupsAccessesAdditionalPropertyType0Item,
)

T = TypeVar("T", bound="UpdateRoomRequestBodyGroupsAccesses")


@_attrs_define
class UpdateRoomRequestBodyGroupsAccesses:
    """A map of group identifiers to permissions list. Setting the value as `null` will clear all groups’ accesses. Setting
    one group identifier as `null` will clear this group’s accesses.

    """

    additional_properties: dict[str, list[UpdateRoomRequestBodyGroupsAccessesAdditionalPropertyType0Item] | None] = (
        _attrs_field(init=False, factory=dict)
    )

    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():
            if isinstance(prop, list):
                field_dict[prop_name] = []
                for additional_property_type_0_item_data in prop:
                    additional_property_type_0_item = additional_property_type_0_item_data.value
                    field_dict[prop_name].append(additional_property_type_0_item)

            else:
                field_dict[prop_name] = prop

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        update_room_request_body_groups_accesses = cls()

        additional_properties = {}
        for prop_name, prop_dict in d.items():

            def _parse_additional_property(
                data: object,
            ) -> list[UpdateRoomRequestBodyGroupsAccessesAdditionalPropertyType0Item] | None:
                if data is None:
                    return data
                try:
                    if not isinstance(data, list):
                        raise TypeError()
                    additional_property_type_0 = []
                    _additional_property_type_0 = data
                    for additional_property_type_0_item_data in _additional_property_type_0:
                        additional_property_type_0_item = (
                            UpdateRoomRequestBodyGroupsAccessesAdditionalPropertyType0Item(
                                additional_property_type_0_item_data
                            )
                        )

                        additional_property_type_0.append(additional_property_type_0_item)

                    return additional_property_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                return cast(list[UpdateRoomRequestBodyGroupsAccessesAdditionalPropertyType0Item] | None, data)

            additional_property = _parse_additional_property(prop_dict)

            additional_properties[prop_name] = additional_property

        update_room_request_body_groups_accesses.additional_properties = additional_properties
        return update_room_request_body_groups_accesses

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> list[UpdateRoomRequestBodyGroupsAccessesAdditionalPropertyType0Item] | None:
        return self.additional_properties[key]

    def __setitem__(
        self, key: str, value: list[UpdateRoomRequestBodyGroupsAccessesAdditionalPropertyType0Item] | None
    ) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
