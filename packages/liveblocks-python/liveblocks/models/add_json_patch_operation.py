from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define

T = TypeVar("T", bound="AddJsonPatchOperation")


@_attrs_define
class AddJsonPatchOperation:
    """
    Attributes:
        op (Literal['add']):
        path (str): A JSON Pointer to the target location (RFC 6901). Must start with "/".
        value (Any):
    """

    op: Literal["add"]
    path: str
    value: Any

    def to_dict(self) -> dict[str, Any]:
        op = self.op

        path = self.path

        value = self.value

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "op": op,
                "path": path,
                "value": value,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        op = cast(Literal["add"], d.pop("op"))
        if op != "add":
            raise ValueError(f"op must match const 'add', got '{op}'")

        path = d.pop("path")

        value = d.pop("value")

        add_json_patch_operation = cls(
            op=op,
            path=path,
            value=value,
        )

        return add_json_patch_operation
