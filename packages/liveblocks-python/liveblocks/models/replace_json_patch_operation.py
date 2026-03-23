from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset


@_attrs_define
class ReplaceJsonPatchOperation:
    """
    Attributes:
        op (Literal['replace'] | Unset):
        path (str | Unset): A JSON Pointer to the target location (RFC 6901). Must start with "/".
        value (Any | Unset):
    """

    op: Literal["replace"] | Unset = UNSET
    path: str | Unset = UNSET
    value: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        op = self.op

        path = self.path

        value = self.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if op is not UNSET:
            field_dict["op"] = op
        if path is not UNSET:
            field_dict["path"] = path
        if value is not UNSET:
            field_dict["value"] = value

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        op = cast(Literal["replace"] | Unset, d.pop("op", UNSET))
        if op != "replace" and not isinstance(op, Unset):
            raise ValueError(f"op must match const 'replace', got '{op}'")

        path = d.pop("path", UNSET)

        value = d.pop("value", UNSET)

        replace_json_patch_operation = cls(
            op=op,
            path=path,
            value=value,
        )

        replace_json_patch_operation.additional_properties = d
        return replace_json_patch_operation

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
