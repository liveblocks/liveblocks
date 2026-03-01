from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.create_room_engine import CreateRoomEngine
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_room_groups_accesses import CreateRoomGroupsAccesses
    from ..models.create_room_metadata import CreateRoomMetadata
    from ..models.create_room_users_accesses import CreateRoomUsersAccesses


T = TypeVar("T", bound="CreateRoom")


@_attrs_define
class CreateRoom:
    """
    Attributes:
        id (str):
        default_accesses (list[str]):
        users_accesses (CreateRoomUsersAccesses | Unset):
        groups_accesses (CreateRoomGroupsAccesses | Unset):
        metadata (CreateRoomMetadata | Unset):
        engine (CreateRoomEngine | Unset): Preferred storage engine version to use when creating new rooms. The v2
            Storage engine supports larger documents, is more performant, has native streaming support, and will become the
            default in the future.
    """

    id: str
    default_accesses: list[str]
    users_accesses: CreateRoomUsersAccesses | Unset = UNSET
    groups_accesses: CreateRoomGroupsAccesses | Unset = UNSET
    metadata: CreateRoomMetadata | Unset = UNSET
    engine: CreateRoomEngine | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

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

        engine: int | Unset = UNSET
        if not isinstance(self.engine, Unset):
            engine = self.engine.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
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

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_room_groups_accesses import CreateRoomGroupsAccesses
        from ..models.create_room_metadata import CreateRoomMetadata
        from ..models.create_room_users_accesses import CreateRoomUsersAccesses

        d = dict(src_dict)
        id = d.pop("id")

        default_accesses = cast(list[str], d.pop("defaultAccesses"))

        _users_accesses = d.pop("usersAccesses", UNSET)
        users_accesses: CreateRoomUsersAccesses | Unset
        if isinstance(_users_accesses, Unset):
            users_accesses = UNSET
        else:
            users_accesses = CreateRoomUsersAccesses.from_dict(_users_accesses)

        _groups_accesses = d.pop("groupsAccesses", UNSET)
        groups_accesses: CreateRoomGroupsAccesses | Unset
        if isinstance(_groups_accesses, Unset):
            groups_accesses = UNSET
        else:
            groups_accesses = CreateRoomGroupsAccesses.from_dict(_groups_accesses)

        _metadata = d.pop("metadata", UNSET)
        metadata: CreateRoomMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = CreateRoomMetadata.from_dict(_metadata)

        _engine = d.pop("engine", UNSET)
        engine: CreateRoomEngine | Unset
        if isinstance(_engine, Unset):
            engine = UNSET
        else:
            engine = CreateRoomEngine(_engine)

        create_room = cls(
            id=id,
            default_accesses=default_accesses,
            users_accesses=users_accesses,
            groups_accesses=groups_accesses,
            metadata=metadata,
            engine=engine,
        )

        create_room.additional_properties = d
        return create_room

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
