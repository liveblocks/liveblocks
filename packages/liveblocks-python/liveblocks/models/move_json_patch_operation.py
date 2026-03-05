from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define

T = TypeVar("T", bound="MoveJsonPatchOperation")


@_attrs_define
class MoveJsonPatchOperation:
    """
    Attributes:
        op (Literal['move']):
        from_ (str): A JSON Pointer to the source location (RFC 6901). Must start with "/".
        path (str): A JSON Pointer to the target location (RFC 6901). Must start with "/".
    """

    op: Literal["move"]
    from_: str
    path: str

    def to_dict(self) -> dict[str, Any]:
        op = self.op

        from_ = self.from_

        path = self.path

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "op": op,
                "from": from_,
                "path": path,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        op = cast(Literal["move"], d.pop("op"))
        if op != "move":
            raise ValueError(f"op must match const 'move', got '{op}'")

        from_ = d.pop("from")

        path = d.pop("path")

        move_json_patch_operation = cls(
            op=op,
            from_=from_,
            path=path,
        )

        return move_json_patch_operation
