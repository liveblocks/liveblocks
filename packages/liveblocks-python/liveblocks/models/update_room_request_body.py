from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.room_permission_item import RoomPermissionItem
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_room_request_body_groups_accesses import UpdateRoomRequestBodyGroupsAccesses
    from ..models.update_room_request_body_metadata import UpdateRoomRequestBodyMetadata
    from ..models.update_room_request_body_users_accesses import UpdateRoomRequestBodyUsersAccesses


T = TypeVar("T", bound="UpdateRoomRequestBody")


@_attrs_define
class UpdateRoomRequestBody:
    """
    Attributes:
        default_accesses (list[RoomPermissionItem] | None | Unset):
        users_accesses (UpdateRoomRequestBodyUsersAccesses | Unset): A map of user identifiers to permissions list.
            Setting the value as `null` will clear all users’ accesses. Setting one user identifier as `null` will clear
            this user’s accesses.
        groups_accesses (UpdateRoomRequestBodyGroupsAccesses | Unset): A map of group identifiers to permissions list.
            Setting the value as `null` will clear all groups’ accesses. Setting one group identifier as `null` will clear
            this group’s accesses.
        metadata (UpdateRoomRequestBodyMetadata | Unset):
    """

    default_accesses: list[RoomPermissionItem] | None | Unset = UNSET
    users_accesses: UpdateRoomRequestBodyUsersAccesses | Unset = UNSET
    groups_accesses: UpdateRoomRequestBodyGroupsAccesses | Unset = UNSET
    metadata: UpdateRoomRequestBodyMetadata | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        default_accesses: list[str] | None | Unset
        if isinstance(self.default_accesses, Unset):
            default_accesses = UNSET
        elif isinstance(self.default_accesses, list):
            default_accesses = []
            for componentsschemas_room_permission_item_data in self.default_accesses:
                componentsschemas_room_permission_item = componentsschemas_room_permission_item_data.value
                default_accesses.append(componentsschemas_room_permission_item)

        else:
            default_accesses = self.default_accesses

        users_accesses: dict[str, Any] | Unset = UNSET
        if not isinstance(self.users_accesses, Unset):
            users_accesses = self.users_accesses.to_dict()

        groups_accesses: dict[str, Any] | Unset = UNSET
        if not isinstance(self.groups_accesses, Unset):
            groups_accesses = self.groups_accesses.to_dict()

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

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
        from ..models.update_room_request_body_groups_accesses import UpdateRoomRequestBodyGroupsAccesses
        from ..models.update_room_request_body_metadata import UpdateRoomRequestBodyMetadata
        from ..models.update_room_request_body_users_accesses import UpdateRoomRequestBodyUsersAccesses

        d = dict(src_dict)

        def _parse_default_accesses(data: object) -> list[RoomPermissionItem] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                default_accesses_type_0 = []
                _default_accesses_type_0 = data
                for componentsschemas_room_permission_item_data in _default_accesses_type_0:
                    componentsschemas_room_permission_item = RoomPermissionItem(
                        componentsschemas_room_permission_item_data
                    )

                    default_accesses_type_0.append(componentsschemas_room_permission_item)

                return default_accesses_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[RoomPermissionItem] | None | Unset, data)

        default_accesses = _parse_default_accesses(d.pop("defaultAccesses", UNSET))

        _users_accesses = d.pop("usersAccesses", UNSET)
        users_accesses: UpdateRoomRequestBodyUsersAccesses | Unset
        if isinstance(_users_accesses, Unset):
            users_accesses = UNSET
        else:
            users_accesses = UpdateRoomRequestBodyUsersAccesses.from_dict(_users_accesses)

        _groups_accesses = d.pop("groupsAccesses", UNSET)
        groups_accesses: UpdateRoomRequestBodyGroupsAccesses | Unset
        if isinstance(_groups_accesses, Unset):
            groups_accesses = UNSET
        else:
            groups_accesses = UpdateRoomRequestBodyGroupsAccesses.from_dict(_groups_accesses)

        _metadata = d.pop("metadata", UNSET)
        metadata: UpdateRoomRequestBodyMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = UpdateRoomRequestBodyMetadata.from_dict(_metadata)

        update_room_request_body = cls(
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
        )

        return update_room_request_body
