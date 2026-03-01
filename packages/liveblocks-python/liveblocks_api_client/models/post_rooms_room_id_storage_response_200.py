from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_rooms_room_id_storage_response_200_data_type_1 import PostRoomsRoomIdStorageResponse200DataType1


T = TypeVar("T", bound="PostRoomsRoomIdStorageResponse200")


@_attrs_define
class PostRoomsRoomIdStorageResponse200:
    """
    Attributes:
        liveblocks_type (str | Unset):
        data (PostRoomsRoomIdStorageResponse200DataType1 | str | Unset):
    """

    liveblocks_type: str | Unset = UNSET
    data: PostRoomsRoomIdStorageResponse200DataType1 | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.post_rooms_room_id_storage_response_200_data_type_1 import (
            PostRoomsRoomIdStorageResponse200DataType1,
        )

        liveblocks_type = self.liveblocks_type

        data: dict[str, Any] | str | Unset
        if isinstance(self.data, Unset):
            data = UNSET
        elif isinstance(self.data, PostRoomsRoomIdStorageResponse200DataType1):
            data = self.data.to_dict()
        else:
            data = self.data

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
        from ..models.post_rooms_room_id_storage_response_200_data_type_1 import (
            PostRoomsRoomIdStorageResponse200DataType1,
        )

        d = dict(src_dict)
        liveblocks_type = d.pop("liveblocksType", UNSET)

        def _parse_data(data: object) -> PostRoomsRoomIdStorageResponse200DataType1 | str | Unset:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                data_type_1 = PostRoomsRoomIdStorageResponse200DataType1.from_dict(data)

                return data_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(PostRoomsRoomIdStorageResponse200DataType1 | str | Unset, data)

        data = _parse_data(d.pop("data", UNSET))

        post_rooms_room_id_storage_response_200 = cls(
            liveblocks_type=liveblocks_type,
            data=data,
        )

        post_rooms_room_id_storage_response_200.additional_properties = d
        return post_rooms_room_id_storage_response_200

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
