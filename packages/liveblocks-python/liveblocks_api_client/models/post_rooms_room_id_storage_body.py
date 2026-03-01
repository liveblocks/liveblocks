from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_rooms_room_id_storage_body_data import PostRoomsRoomIdStorageBodyData


T = TypeVar("T", bound="PostRoomsRoomIdStorageBody")


@_attrs_define
class PostRoomsRoomIdStorageBody:
    """
    Attributes:
        liveblocks_type (str | Unset):
        data (PostRoomsRoomIdStorageBodyData | Unset):
    """

    liveblocks_type: str | Unset = UNSET
    data: PostRoomsRoomIdStorageBodyData | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        liveblocks_type = self.liveblocks_type

        data: dict[str, Any] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = self.data.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if liveblocks_type is not UNSET:
            field_dict["liveblocksType"] = liveblocks_type
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_rooms_room_id_storage_body_data import PostRoomsRoomIdStorageBodyData

        d = dict(src_dict)
        liveblocks_type = d.pop("liveblocksType", UNSET)

        _data = d.pop("data", UNSET)
        data: PostRoomsRoomIdStorageBodyData | Unset
        if isinstance(_data, Unset):
            data = UNSET
        else:
            data = PostRoomsRoomIdStorageBodyData.from_dict(_data)

        post_rooms_room_id_storage_body = cls(
            liveblocks_type=liveblocks_type,
            data=data,
        )

        post_rooms_room_id_storage_body.additional_properties = d
        return post_rooms_room_id_storage_body

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
