from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.patch_rooms_room_id_storage_json_patch_body_item_op import PatchRoomsRoomIdStorageJsonPatchBodyItemOp
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchRoomsRoomIdStorageJsonPatchBodyItem")


@_attrs_define
class PatchRoomsRoomIdStorageJsonPatchBodyItem:
    """
    Attributes:
        op (PatchRoomsRoomIdStorageJsonPatchBodyItemOp): The operation to perform (RFC 6902).
        path (str): A JSON Pointer to the target location (RFC 6901). Must start with "/".
        from_ (str | Unset): Required for "move" and "copy". A JSON Pointer to the source location.
        value (Any | Unset): Required for "add", "replace", and "test". The value to add, the replacement value, or the
            value to test against.
    """

    op: PatchRoomsRoomIdStorageJsonPatchBodyItemOp
    path: str
    from_: str | Unset = UNSET
    value: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        op = self.op.value

        path = self.path

        from_ = self.from_

        value = self.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "op": op,
                "path": path,
            }
        )
        if from_ is not UNSET:
            field_dict["from"] = from_
        if value is not UNSET:
            field_dict["value"] = value

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        op = PatchRoomsRoomIdStorageJsonPatchBodyItemOp(d.pop("op"))

        path = d.pop("path")

        from_ = d.pop("from", UNSET)

        value = d.pop("value", UNSET)

        patch_rooms_room_id_storage_json_patch_body_item = cls(
            op=op,
            path=path,
            from_=from_,
            value=value,
        )

        patch_rooms_room_id_storage_json_patch_body_item.additional_properties = d
        return patch_rooms_room_id_storage_json_patch_body_item

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
