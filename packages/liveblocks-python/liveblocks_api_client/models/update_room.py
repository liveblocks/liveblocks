from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_room_groups_accesses_type_0 import UpdateRoomGroupsAccessesType0
    from ..models.update_room_metadata_type_0 import UpdateRoomMetadataType0
    from ..models.update_room_users_accesses_type_0 import UpdateRoomUsersAccessesType0


T = TypeVar("T", bound="UpdateRoom")


@_attrs_define
class UpdateRoom:
    """
    Attributes:
        default_accesses (list[str] | None | Unset):
        users_accesses (None | Unset | UpdateRoomUsersAccessesType0): A map of user identifiers to permissions list.
            Setting the value as `null` will clear all users’ accesses. Setting one user identifier as `null` will clear
            this user’s accesses.
        groups_accesses (None | Unset | UpdateRoomGroupsAccessesType0): A map of group identifiers to permissions list.
            Setting the value as `null` will clear all groups’ accesses. Setting one group identifier as `null` will clear
            this group’s accesses.
        metadata (None | Unset | UpdateRoomMetadataType0): A map of metadata keys to their values (`string` or
            `string[]`). Setting the value as `null` will clear all metadata. Setting a key as `null` will clear the key.
    """

    default_accesses: list[str] | None | Unset = UNSET
    users_accesses: None | Unset | UpdateRoomUsersAccessesType0 = UNSET
    groups_accesses: None | Unset | UpdateRoomGroupsAccessesType0 = UNSET
    metadata: None | Unset | UpdateRoomMetadataType0 = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.update_room_groups_accesses_type_0 import UpdateRoomGroupsAccessesType0
        from ..models.update_room_metadata_type_0 import UpdateRoomMetadataType0
        from ..models.update_room_users_accesses_type_0 import UpdateRoomUsersAccessesType0

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
        elif isinstance(self.users_accesses, UpdateRoomUsersAccessesType0):
            users_accesses = self.users_accesses.to_dict()
        else:
            users_accesses = self.users_accesses

        groups_accesses: dict[str, Any] | None | Unset
        if isinstance(self.groups_accesses, Unset):
            groups_accesses = UNSET
        elif isinstance(self.groups_accesses, UpdateRoomGroupsAccessesType0):
            groups_accesses = self.groups_accesses.to_dict()
        else:
            groups_accesses = self.groups_accesses

        metadata: dict[str, Any] | None | Unset
        if isinstance(self.metadata, Unset):
            metadata = UNSET
        elif isinstance(self.metadata, UpdateRoomMetadataType0):
            metadata = self.metadata.to_dict()
        else:
            metadata = self.metadata

        field_dict: dict[str, Any] = {}

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
        from ..models.update_room_groups_accesses_type_0 import UpdateRoomGroupsAccessesType0
        from ..models.update_room_metadata_type_0 import UpdateRoomMetadataType0
        from ..models.update_room_users_accesses_type_0 import UpdateRoomUsersAccessesType0

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

        def _parse_users_accesses(data: object) -> None | Unset | UpdateRoomUsersAccessesType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                users_accesses_type_0 = UpdateRoomUsersAccessesType0.from_dict(data)

                return users_accesses_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpdateRoomUsersAccessesType0, data)

        users_accesses = _parse_users_accesses(d.pop("usersAccesses", UNSET))

        def _parse_groups_accesses(data: object) -> None | Unset | UpdateRoomGroupsAccessesType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                groups_accesses_type_0 = UpdateRoomGroupsAccessesType0.from_dict(data)

                return groups_accesses_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpdateRoomGroupsAccessesType0, data)

        groups_accesses = _parse_groups_accesses(d.pop("groupsAccesses", UNSET))

        def _parse_metadata(data: object) -> None | Unset | UpdateRoomMetadataType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                metadata_type_0 = UpdateRoomMetadataType0.from_dict(data)

                return metadata_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpdateRoomMetadataType0, data)

        metadata = _parse_metadata(d.pop("metadata", UNSET))

        update_room = cls(
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
        )

        return update_room
