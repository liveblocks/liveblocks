from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, Self, cast

from attrs import define as _attrs_define


@_attrs_define
class RemoveJsonPatchOperation:
    """
    Attributes:
        op (Literal['remove']):
        path (str): A JSON Pointer to the target location (RFC 6901). Must start with "/".
    """

    op: Literal["remove"]
    path: str

    def to_dict(self) -> dict[str, Any]:
        op = self.op

        path = self.path

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "op": op,
                "path": path,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        op = cast(Literal["remove"], d.pop("op"))
        if op != "remove":
            raise ValueError(f"op must match const 'remove', got '{op}'")

        path = d.pop("path")

        remove_json_patch_operation = cls(
            op=op,
            path=path,
        )

        return remove_json_patch_operation
