from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.upsert_room_create import UpsertRoomCreate
    from ..models.upsert_room_update import UpsertRoomUpdate


T = TypeVar("T", bound="UpsertRoom")


@_attrs_define
class UpsertRoom:
    """
    Attributes:
        update (UpsertRoomUpdate):
        create (UpsertRoomCreate | Unset):
    """

    update: UpsertRoomUpdate
    create: UpsertRoomCreate | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        update = self.update.to_dict()

        create: dict[str, Any] | Unset = UNSET
        if not isinstance(self.create, Unset):
            create = self.create.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "update": update,
            }
        )
        if create is not UNSET:
            field_dict["create"] = create

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.upsert_room_create import UpsertRoomCreate
        from ..models.upsert_room_update import UpsertRoomUpdate

        d = dict(src_dict)
        update = UpsertRoomUpdate.from_dict(d.pop("update"))

        _create = d.pop("create", UNSET)
        create: UpsertRoomCreate | Unset
        if isinstance(_create, Unset):
            create = UNSET
        else:
            create = UpsertRoomCreate.from_dict(_create)

        upsert_room = cls(
            update=update,
            create=create,
        )

        return upsert_room
