from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_room_request_body import CreateRoomRequestBody
    from ..models.update_room_request_body import UpdateRoomRequestBody


T = TypeVar("T", bound="UpsertRoomRequestBody")


@_attrs_define
class UpsertRoomRequestBody:
    """
    Attributes:
        update (UpdateRoomRequestBody):
        create (CreateRoomRequestBody | Unset):
    """

    update: UpdateRoomRequestBody
    create: CreateRoomRequestBody | Unset = UNSET

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
        from ..models.create_room_request_body import CreateRoomRequestBody
        from ..models.update_room_request_body import UpdateRoomRequestBody

        d = dict(src_dict)
        update = UpdateRoomRequestBody.from_dict(d.pop("update"))

        _create = d.pop("create", UNSET)
        create: CreateRoomRequestBody | Unset
        if isinstance(_create, Unset):
            create = UNSET
        else:
            create = CreateRoomRequestBody.from_dict(_create)

        upsert_room_request_body = cls(
            update=update,
            create=create,
        )

        return upsert_room_request_body
