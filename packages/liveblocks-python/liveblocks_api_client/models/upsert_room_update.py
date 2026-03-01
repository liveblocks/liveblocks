from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.upsert_room_update_groups_accesses_type_0 import UpsertRoomUpdateGroupsAccessesType0
    from ..models.upsert_room_update_metadata_type_0 import UpsertRoomUpdateMetadataType0
    from ..models.upsert_room_update_users_accesses_type_0 import UpsertRoomUpdateUsersAccessesType0


T = TypeVar("T", bound="UpsertRoomUpdate")


@_attrs_define
class UpsertRoomUpdate:
    """
    Attributes:
        default_accesses (list[str] | None | Unset):
        users_accesses (None | Unset | UpsertRoomUpdateUsersAccessesType0): A map of user identifiers to permissions
            list. Setting the value as `null` will clear all users’ accesses. Setting one user identifier as `null` will
            clear this user’s accesses.
        groups_accesses (None | Unset | UpsertRoomUpdateGroupsAccessesType0): A map of group identifiers to permissions
            list. Setting the value as `null` will clear all groups’ accesses. Setting one group identifier as `null` will
            clear this group’s accesses.
        metadata (None | Unset | UpsertRoomUpdateMetadataType0): A map of metadata keys to their values (`string` or
            `string[]`). Setting the value as `null` will clear all metadata. Setting a key as `null` will clear the key.
    """

    default_accesses: list[str] | None | Unset = UNSET
    users_accesses: None | Unset | UpsertRoomUpdateUsersAccessesType0 = UNSET
    groups_accesses: None | Unset | UpsertRoomUpdateGroupsAccessesType0 = UNSET
    metadata: None | Unset | UpsertRoomUpdateMetadataType0 = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.upsert_room_update_groups_accesses_type_0 import UpsertRoomUpdateGroupsAccessesType0
        from ..models.upsert_room_update_metadata_type_0 import UpsertRoomUpdateMetadataType0
        from ..models.upsert_room_update_users_accesses_type_0 import UpsertRoomUpdateUsersAccessesType0

        default_accesses: list[str] | None | Unset
        if isinstance(self.default_accesses, Unset):
            default_accesses = UNSET
        elif isinstance(self.default_accesses, list):
            default_accesses = self.default_accesses

        else:
            default_accesses = self.default_accesses

        users_accesses: dict[str, Any] | None | Unset
        if isinstance(self.users_accesses, Unset):
            users_accesses = UNSET
        elif isinstance(self.users_accesses, UpsertRoomUpdateUsersAccessesType0):
            users_accesses = self.users_accesses.to_dict()
        else:
            users_accesses = self.users_accesses

        groups_accesses: dict[str, Any] | None | Unset
        if isinstance(self.groups_accesses, Unset):
            groups_accesses = UNSET
        elif isinstance(self.groups_accesses, UpsertRoomUpdateGroupsAccessesType0):
            groups_accesses = self.groups_accesses.to_dict()
        else:
            groups_accesses = self.groups_accesses

        metadata: dict[str, Any] | None | Unset
        if isinstance(self.metadata, Unset):
            metadata = UNSET
        elif isinstance(self.metadata, UpsertRoomUpdateMetadataType0):
            metadata = self.metadata.to_dict()
        else:
            metadata = self.metadata

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if default_accesses is not UNSET:
            field_dict["defaultAccesses"] = default_accesses
        if users_accesses is not UNSET:
            field_dict["usersAccesses"] = users_accesses
        if groups_accesses is not UNSET:
            field_dict["groupsAccesses"] = groups_accesses
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.upsert_room_update_groups_accesses_type_0 import UpsertRoomUpdateGroupsAccessesType0
        from ..models.upsert_room_update_metadata_type_0 import UpsertRoomUpdateMetadataType0
        from ..models.upsert_room_update_users_accesses_type_0 import UpsertRoomUpdateUsersAccessesType0

        d = dict(src_dict)

        def _parse_default_accesses(data: object) -> list[str] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                default_accesses_type_0 = cast(list[str], data)

                return default_accesses_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[str] | None | Unset, data)

        default_accesses = _parse_default_accesses(d.pop("defaultAccesses", UNSET))

        def _parse_users_accesses(data: object) -> None | Unset | UpsertRoomUpdateUsersAccessesType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                users_accesses_type_0 = UpsertRoomUpdateUsersAccessesType0.from_dict(data)

                return users_accesses_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpsertRoomUpdateUsersAccessesType0, data)

        users_accesses = _parse_users_accesses(d.pop("usersAccesses", UNSET))

        def _parse_groups_accesses(data: object) -> None | Unset | UpsertRoomUpdateGroupsAccessesType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                groups_accesses_type_0 = UpsertRoomUpdateGroupsAccessesType0.from_dict(data)

                return groups_accesses_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpsertRoomUpdateGroupsAccessesType0, data)

        groups_accesses = _parse_groups_accesses(d.pop("groupsAccesses", UNSET))

        def _parse_metadata(data: object) -> None | Unset | UpsertRoomUpdateMetadataType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                metadata_type_0 = UpsertRoomUpdateMetadataType0.from_dict(data)

                return metadata_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpsertRoomUpdateMetadataType0, data)

        metadata = _parse_metadata(d.pop("metadata", UNSET))

        upsert_room_update = cls(
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
        )

        upsert_room_update.additional_properties = d
        return upsert_room_update

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
