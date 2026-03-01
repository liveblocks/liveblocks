from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.room_type import RoomType
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.room_groups_accesses import RoomGroupsAccesses
    from ..models.room_metadata import RoomMetadata
    from ..models.room_users_accesses import RoomUsersAccesses


T = TypeVar("T", bound="Room")


@_attrs_define
class Room:
    """
    Attributes:
        id (str | Unset):
        type_ (RoomType | Unset):
        last_connection_at (datetime.datetime | Unset):
        created_at (datetime.datetime | Unset):
        metadata (RoomMetadata | Unset):
        default_accesses (list[Any] | str | Unset):
        users_accesses (RoomUsersAccesses | Unset):
        groups_accesses (RoomGroupsAccesses | Unset):
    """

    id: str | Unset = UNSET
    type_: RoomType | Unset = UNSET
    last_connection_at: datetime.datetime | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    metadata: RoomMetadata | Unset = UNSET
    default_accesses: list[Any] | str | Unset = UNSET
    users_accesses: RoomUsersAccesses | Unset = UNSET
    groups_accesses: RoomGroupsAccesses | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        type_: str | Unset = UNSET
        if not isinstance(self.type_, Unset):
            type_ = self.type_.value

        last_connection_at: str | Unset = UNSET
        if not isinstance(self.last_connection_at, Unset):
            last_connection_at = self.last_connection_at.isoformat()

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        default_accesses: list[Any] | str | Unset
        if isinstance(self.default_accesses, Unset):
            default_accesses = UNSET
        elif isinstance(self.default_accesses, list):
            default_accesses = self.default_accesses

        else:
            default_accesses = self.default_accesses

        users_accesses: dict[str, Any] | Unset = UNSET
        if not isinstance(self.users_accesses, Unset):
            users_accesses = self.users_accesses.to_dict()

        groups_accesses: dict[str, Any] | Unset = UNSET
        if not isinstance(self.groups_accesses, Unset):
            groups_accesses = self.groups_accesses.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if type_ is not UNSET:
            field_dict["type"] = type_
        if last_connection_at is not UNSET:
            field_dict["lastConnectionAt"] = last_connection_at
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if metadata is not UNSET:
            field_dict["metadata"] = metadata
        if default_accesses is not UNSET:
            field_dict["defaultAccesses"] = default_accesses
        if users_accesses is not UNSET:
            field_dict["usersAccesses"] = users_accesses
        if groups_accesses is not UNSET:
            field_dict["groupsAccesses"] = groups_accesses

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.room_groups_accesses import RoomGroupsAccesses
        from ..models.room_metadata import RoomMetadata
        from ..models.room_users_accesses import RoomUsersAccesses

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        _type_ = d.pop("type", UNSET)
        type_: RoomType | Unset
        if isinstance(_type_, Unset):
            type_ = UNSET
        else:
            type_ = RoomType(_type_)

        _last_connection_at = d.pop("lastConnectionAt", UNSET)
        last_connection_at: datetime.datetime | Unset
        if isinstance(_last_connection_at, Unset):
            last_connection_at = UNSET
        else:
            last_connection_at = isoparse(_last_connection_at)

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = isoparse(_created_at)

        _metadata = d.pop("metadata", UNSET)
        metadata: RoomMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = RoomMetadata.from_dict(_metadata)

        def _parse_default_accesses(data: object) -> list[Any] | str | Unset:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                default_accesses_type_1 = cast(list[Any], data)

                return default_accesses_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[Any] | str | Unset, data)

        default_accesses = _parse_default_accesses(d.pop("defaultAccesses", UNSET))

        _users_accesses = d.pop("usersAccesses", UNSET)
        users_accesses: RoomUsersAccesses | Unset
        if isinstance(_users_accesses, Unset):
            users_accesses = UNSET
        else:
            users_accesses = RoomUsersAccesses.from_dict(_users_accesses)

        _groups_accesses = d.pop("groupsAccesses", UNSET)
        groups_accesses: RoomGroupsAccesses | Unset
        if isinstance(_groups_accesses, Unset):
            groups_accesses = UNSET
        else:
            groups_accesses = RoomGroupsAccesses.from_dict(_groups_accesses)

        room = cls(
            id=id,
            type_=type_,
            last_connection_at=last_connection_at,
            created_at=created_at,
            metadata=metadata,
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
        )

        room.additional_properties = d
        return room

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
