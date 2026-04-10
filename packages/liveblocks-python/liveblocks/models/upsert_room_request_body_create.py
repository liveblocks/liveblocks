from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..models.room_permission_item import RoomPermissionItem
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.room_accesses import RoomAccesses
    from ..models.room_metadata import RoomMetadata


@_attrs_define
class UpsertRoomRequestBodyCreate:
    """Fields to use when creating the room if it does not exist. Unlike the create-room endpoint, `id` is not included
    here because it is provided in the URL path.

        Attributes:
            default_accesses (list[RoomPermissionItem]):  Example: ['room:read', 'room:presence:write'].
            organization_id (str | Unset): The organization ID to associate with the room. Defaults to "default" if not
                provided.
            users_accesses (RoomAccesses | Unset):  Example: {'alice': ['room:write'], 'bob': ['room:read',
                'room:presence:write']}.
            groups_accesses (RoomAccesses | Unset):  Example: {'alice': ['room:write'], 'bob': ['room:read',
                'room:presence:write']}.
            metadata (RoomMetadata | Unset):  Example: {'color': 'blue', 'type': 'whiteboard'}.
    """

    default_accesses: list[RoomPermissionItem]
    organization_id: str | Unset = UNSET
    users_accesses: RoomAccesses | Unset = UNSET
    groups_accesses: RoomAccesses | Unset = UNSET
    metadata: RoomMetadata | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        default_accesses = []
        for componentsschemas_room_permission_item_data in self.default_accesses:
            componentsschemas_room_permission_item = componentsschemas_room_permission_item_data.value
            default_accesses.append(componentsschemas_room_permission_item)

        organization_id = self.organization_id

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

        field_dict.update(
            {
                "defaultAccesses": default_accesses,
            }
        )
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id
        if users_accesses is not UNSET:
            field_dict["usersAccesses"] = users_accesses
        if groups_accesses is not UNSET:
            field_dict["groupsAccesses"] = groups_accesses
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.room_accesses import RoomAccesses
        from ..models.room_metadata import RoomMetadata

        d = dict(src_dict)
        default_accesses = []
        _default_accesses = d.pop("defaultAccesses")
        for componentsschemas_room_permission_item_data in _default_accesses:
            componentsschemas_room_permission_item = RoomPermissionItem(componentsschemas_room_permission_item_data)

            default_accesses.append(componentsschemas_room_permission_item)

        organization_id = d.pop("organizationId", UNSET)

        _users_accesses = d.pop("usersAccesses", UNSET)
        users_accesses: RoomAccesses | Unset
        if isinstance(_users_accesses, Unset):
            users_accesses = UNSET
        else:
            users_accesses = RoomAccesses.from_dict(_users_accesses)

        _groups_accesses = d.pop("groupsAccesses", UNSET)
        groups_accesses: RoomAccesses | Unset
        if isinstance(_groups_accesses, Unset):
            groups_accesses = UNSET
        else:
            groups_accesses = RoomAccesses.from_dict(_groups_accesses)

        _metadata = d.pop("metadata", UNSET)
        metadata: RoomMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = RoomMetadata.from_dict(_metadata)

        upsert_room_request_body_create = cls(
            default_accesses=default_accesses,
            organization_id=organization_id,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
        )

        return upsert_room_request_body_create
