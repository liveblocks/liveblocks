from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..models.create_room_request_body_engine import CreateRoomRequestBodyEngine
from ..models.room_permission_item import RoomPermissionItem
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.room_accesses import RoomAccesses
    from ..models.room_metadata import RoomMetadata


@_attrs_define
class CreateRoomRequestBody:
    """
    Example:
        {'id': 'my-room-id', 'defaultAccesses': ['room:write'], 'metadata': {'color': 'blue'}, 'usersAccesses':
            {'alice': ['room:write']}, 'groupsAccesses': {'product': ['room:write']}}

    Attributes:
        id (str):
        default_accesses (list[RoomPermissionItem]):  Example: ['room:read', 'room:presence:write'].
        organization_id (str | Unset):
        users_accesses (RoomAccesses | Unset):  Example: {'alice': ['room:write'], 'bob': ['room:read',
            'room:presence:write']}.
        groups_accesses (RoomAccesses | Unset):  Example: {'alice': ['room:write'], 'bob': ['room:read',
            'room:presence:write']}.
        metadata (RoomMetadata | Unset):  Example: {'color': 'blue', 'type': 'whiteboard'}.
        engine (CreateRoomRequestBodyEngine | Unset): Preferred storage engine version to use when creating new rooms.
            The v2 Storage engine supports larger documents, is more performant, has native streaming support, and will
            become the default in the future.
    """

    id: str
    default_accesses: list[RoomPermissionItem]
    organization_id: str | Unset = UNSET
    users_accesses: RoomAccesses | Unset = UNSET
    groups_accesses: RoomAccesses | Unset = UNSET
    metadata: RoomMetadata | Unset = UNSET
    engine: CreateRoomRequestBodyEngine | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id

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

        engine: int | Unset = UNSET
        if not isinstance(self.engine, Unset):
            engine = self.engine.value

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
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
        if engine is not UNSET:
            field_dict["engine"] = engine

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.room_accesses import RoomAccesses
        from ..models.room_metadata import RoomMetadata

        d = dict(src_dict)
        id = d.pop("id")

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

        _engine = d.pop("engine", UNSET)
        engine: CreateRoomRequestBodyEngine | Unset
        if isinstance(_engine, Unset):
            engine = UNSET
        else:
            engine = CreateRoomRequestBodyEngine(_engine)

        create_room_request_body = cls(
            id=id,
            default_accesses=default_accesses,
            organization_id=organization_id,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
            engine=engine,
        )

        return create_room_request_body
