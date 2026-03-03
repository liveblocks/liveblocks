from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="UpdateRoomIdRequestBody")


@_attrs_define
class UpdateRoomIdRequestBody:
    """
    Attributes:
        new_room_id (str): The new room ID
    """

    new_room_id: str

    def to_dict(self) -> dict[str, Any]:
        new_room_id = self.new_room_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "newRoomId": new_room_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        new_room_id = d.pop("newRoomId")

        update_room_id_request_body = cls(
            new_room_id=new_room_id,
        )

        return update_room_id_request_body
