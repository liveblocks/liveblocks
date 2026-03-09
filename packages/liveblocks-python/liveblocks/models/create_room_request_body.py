from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.create_room_request_body_engine import CreateRoomRequestBodyEngine
from ..models.room_permission_item import RoomPermissionItem
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.room_accesses import RoomAccesses
    from ..models.room_metadata import RoomMetadata


T = TypeVar("T", bound="CreateRoomRequestBody")


@_attrs_define
class CreateRoomRequestBody:
    """
    Attributes:
        id (str):
        default_accesses (list[RoomPermissionItem]):  Example: ['room:read', 'room:presence:write'].
        users_accesses (RoomAccesses | Unset):
        groups_accesses (RoomAccesses | Unset):
        metadata (RoomMetadata | Unset):
        engine (CreateRoomRequestBodyEngine | Unset): Preferred storage engine version to use when creating new rooms.
            The v2 Storage engine supports larger documents, is more performant, has native streaming support, and will
            become the default in the future.
        organization_id (str | Unset):
    """

    id: str
    default_accesses: list[RoomPermissionItem]
    users_accesses: RoomAccesses | Unset = UNSET
    groups_accesses: RoomAccesses | Unset = UNSET
    metadata: RoomMetadata | Unset = UNSET
    engine: CreateRoomRequestBodyEngine | Unset = UNSET
    organization_id: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        default_accesses = []
        for componentsschemas_room_permission_item_data in self.default_accesses:
            componentsschemas_room_permission_item = componentsschemas_room_permission_item_data.value
            default_accesses.append(componentsschemas_room_permission_item)

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

        organization_id = self.organization_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "defaultAccesses": default_accesses,
            }
        )
        if users_accesses is not UNSET:
            field_dict["usersAccesses"] = users_accesses
        if groups_accesses is not UNSET:
            field_dict["groupsAccesses"] = groups_accesses
        if metadata is not UNSET:
            field_dict["metadata"] = metadata
        if engine is not UNSET:
            field_dict["engine"] = engine
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.room_accesses import RoomAccesses
        from ..models.room_metadata import RoomMetadata

        d = dict(src_dict)
        id = d.pop("id")

        default_accesses = []
        _default_accesses = d.pop("defaultAccesses")
        for componentsschemas_room_permission_item_data in _default_accesses:
            componentsschemas_room_permission_item = RoomPermissionItem(componentsschemas_room_permission_item_data)

            default_accesses.append(componentsschemas_room_permission_item)

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

        organization_id = d.pop("organizationId", UNSET)

        create_room_request_body = cls(
            id=id,
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
            engine=engine,
            organization_id=organization_id,
        )

        return create_room_request_body
