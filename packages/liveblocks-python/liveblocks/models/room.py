from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..models.room_permission_item import RoomPermissionItem
from ..models.room_type import RoomType
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.room_accesses import RoomAccesses
    from ..models.room_metadata import RoomMetadata


T = TypeVar("T", bound="Room")


@_attrs_define
class Room:
    """
    Attributes:
        id (str):
        type_ (RoomType):
        created_at (datetime.datetime):
        default_accesses (list[RoomPermissionItem]):  Example: ['room:read', 'room:presence:write'].
        users_accesses (RoomAccesses):
        groups_accesses (RoomAccesses):
        metadata (RoomMetadata):
        organization_id (str):
        last_connection_at (datetime.datetime | Unset):
    """

    id: str
    type_: RoomType
    created_at: datetime.datetime
    default_accesses: list[RoomPermissionItem]
    users_accesses: RoomAccesses
    groups_accesses: RoomAccesses
    metadata: RoomMetadata
    organization_id: str
    last_connection_at: datetime.datetime | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        type_ = self.type_.value

        created_at = self.created_at.isoformat()

        default_accesses = []
        for componentsschemas_room_permission_item_data in self.default_accesses:
            componentsschemas_room_permission_item = componentsschemas_room_permission_item_data.value
            default_accesses.append(componentsschemas_room_permission_item)

        users_accesses = self.users_accesses.to_dict()

        groups_accesses = self.groups_accesses.to_dict()

        metadata = self.metadata.to_dict()

        organization_id = self.organization_id

        last_connection_at: str | Unset = UNSET
        if not isinstance(self.last_connection_at, Unset):
            last_connection_at = self.last_connection_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "type": type_,
                "createdAt": created_at,
                "defaultAccesses": default_accesses,
                "usersAccesses": users_accesses,
                "groupsAccesses": groups_accesses,
                "metadata": metadata,
                "organizationId": organization_id,
            }
        )
        if last_connection_at is not UNSET:
            field_dict["lastConnectionAt"] = last_connection_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.room_accesses import RoomAccesses
        from ..models.room_metadata import RoomMetadata

        d = dict(src_dict)
        id = d.pop("id")

        type_ = RoomType(d.pop("type"))

        created_at = isoparse(d.pop("createdAt"))

        default_accesses = []
        _default_accesses = d.pop("defaultAccesses")
        for componentsschemas_room_permission_item_data in _default_accesses:
            componentsschemas_room_permission_item = RoomPermissionItem(componentsschemas_room_permission_item_data)

            default_accesses.append(componentsschemas_room_permission_item)

        users_accesses = RoomAccesses.from_dict(d.pop("usersAccesses"))

        groups_accesses = RoomAccesses.from_dict(d.pop("groupsAccesses"))

        metadata = RoomMetadata.from_dict(d.pop("metadata"))

        organization_id = d.pop("organizationId")

        _last_connection_at = d.pop("lastConnectionAt", UNSET)
        last_connection_at: datetime.datetime | Unset
        if isinstance(_last_connection_at, Unset):
            last_connection_at = UNSET
        else:
            last_connection_at = isoparse(_last_connection_at)

        room = cls(
            id=id,
            type_=type_,
            created_at=created_at,
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
            organization_id=organization_id,
            last_connection_at=last_connection_at,
        )

        return room
