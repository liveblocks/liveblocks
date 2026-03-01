from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.upsert_room_create_groups_accesses_type_0 import UpsertRoomCreateGroupsAccessesType0
    from ..models.upsert_room_create_metadata_type_0 import UpsertRoomCreateMetadataType0
    from ..models.upsert_room_create_users_accesses_type_0 import UpsertRoomCreateUsersAccessesType0


T = TypeVar("T", bound="UpsertRoomCreate")


@_attrs_define
class UpsertRoomCreate:
    """
    Attributes:
        default_accesses (list[str]):
        users_accesses (Unset | UpsertRoomCreateUsersAccessesType0): A map of user identifiers to permissions list.
        groups_accesses (Unset | UpsertRoomCreateGroupsAccessesType0): A map of group identifiers to permissions list.
        metadata (Unset | UpsertRoomCreateMetadataType0): A map of metadata keys to their values (`string` or
            `string[]`).
    """

    default_accesses: list[str]
    users_accesses: Unset | UpsertRoomCreateUsersAccessesType0 = UNSET
    groups_accesses: Unset | UpsertRoomCreateGroupsAccessesType0 = UNSET
    metadata: Unset | UpsertRoomCreateMetadataType0 = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        default_accesses: list[str]
        if isinstance(self.default_accesses, list):
            default_accesses = self.default_accesses

        users_accesses: dict[str, Any] | Unset
        if isinstance(self.users_accesses, Unset):
            users_accesses = UNSET
        else:
            users_accesses = self.users_accesses.to_dict()

        groups_accesses: dict[str, Any] | Unset
        if isinstance(self.groups_accesses, Unset):
            groups_accesses = UNSET
        else:
            groups_accesses = self.groups_accesses.to_dict()

        metadata: dict[str, Any] | Unset
        if isinstance(self.metadata, Unset):
            metadata = UNSET
        else:
            metadata = self.metadata.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "defaultAccesses": default_accesses,
            }
        )
        if users_accesses is not UNSET:
            field_dict["usersAccesses"] = users_accesses
        if groups_accesses is not UNSET:
            field_dict["groupsAccesses"] = groups_accesses
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.upsert_room_create_groups_accesses_type_0 import UpsertRoomCreateGroupsAccessesType0
        from ..models.upsert_room_create_metadata_type_0 import UpsertRoomCreateMetadataType0
        from ..models.upsert_room_create_users_accesses_type_0 import UpsertRoomCreateUsersAccessesType0

        d = dict(src_dict)

        def _parse_default_accesses(data: object) -> list[str]:
            if not isinstance(data, list):
                raise TypeError()
            default_accesses_type_0 = cast(list[str], data)

            return default_accesses_type_0

        default_accesses = _parse_default_accesses(d.pop("defaultAccesses"))

        def _parse_users_accesses(data: object) -> Unset | UpsertRoomCreateUsersAccessesType0:
            if isinstance(data, Unset):
                return data
            if not isinstance(data, dict):
                raise TypeError()
            users_accesses_type_0 = UpsertRoomCreateUsersAccessesType0.from_dict(data)

            return users_accesses_type_0

        users_accesses = _parse_users_accesses(d.pop("usersAccesses", UNSET))

        def _parse_groups_accesses(data: object) -> Unset | UpsertRoomCreateGroupsAccessesType0:
            if isinstance(data, Unset):
                return data
            if not isinstance(data, dict):
                raise TypeError()
            groups_accesses_type_0 = UpsertRoomCreateGroupsAccessesType0.from_dict(data)

            return groups_accesses_type_0

        groups_accesses = _parse_groups_accesses(d.pop("groupsAccesses", UNSET))

        def _parse_metadata(data: object) -> Unset | UpsertRoomCreateMetadataType0:
            if isinstance(data, Unset):
                return data
            if not isinstance(data, dict):
                raise TypeError()
            metadata_type_0 = UpsertRoomCreateMetadataType0.from_dict(data)

            return metadata_type_0

        metadata = _parse_metadata(d.pop("metadata", UNSET))

        upsert_room_create = cls(
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
        )

        upsert_room_create.additional_properties = d
        return upsert_room_create

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
