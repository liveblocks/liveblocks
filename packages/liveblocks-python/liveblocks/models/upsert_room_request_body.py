from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_room_request_body import UpdateRoomRequestBody
    from ..models.upsert_room_request_body_create import UpsertRoomRequestBodyCreate


@_attrs_define
class UpsertRoomRequestBody:
    """
    Example:
        {'update': {'usersAccesses': {'alice': ['room:write']}, 'groupsAccesses': {'marketing': ['room:write']},
            'metadata': {'color': 'blue'}}, 'create': {'defaultAccesses': ['room:write']}}

    Attributes:
        update (UpdateRoomRequestBody):  Example: {'defaultAccesses': ['room:write'], 'usersAccesses': {'alice':
            ['room:write']}, 'groupsAccesses': {'marketing': ['room:write']}, 'metadata': {'color': 'blue'}}.
        create (UpsertRoomRequestBodyCreate | Unset): Fields to use when creating the room if it does not exist. Unlike
            the create-room endpoint, `id` is not included here because it is provided in the URL path.
    """

    update: UpdateRoomRequestBody
    create: UpsertRoomRequestBodyCreate | Unset = UNSET

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
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.update_room_request_body import UpdateRoomRequestBody
        from ..models.upsert_room_request_body_create import UpsertRoomRequestBodyCreate

        d = dict(src_dict)
        update = UpdateRoomRequestBody.from_dict(d.pop("update"))

        _create = d.pop("create", UNSET)
        create: UpsertRoomRequestBodyCreate | Unset
        if isinstance(_create, Unset):
            create = UNSET
        else:
            create = UpsertRoomRequestBodyCreate.from_dict(_create)

        upsert_room_request_body = cls(
            update=update,
            create=create,
        )

        return upsert_room_request_body
