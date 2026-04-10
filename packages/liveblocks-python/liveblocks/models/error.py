from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset


@_attrs_define
class Error:
    """
    Attributes:
        error (str | Unset): Error code
        message (str | Unset): Message explaining the error
        suggestion (str | Unset): A suggestion on how to fix the error
        docs (str | Unset): A link to the documentation
    """

    error: str | Unset = UNSET
    message: str | Unset = UNSET
    suggestion: str | Unset = UNSET
    docs: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        error = self.error

        message = self.message

        suggestion = self.suggestion

        docs = self.docs

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if error is not UNSET:
            field_dict["error"] = error
        if message is not UNSET:
            field_dict["message"] = message
        if suggestion is not UNSET:
            field_dict["suggestion"] = suggestion
        if docs is not UNSET:
            field_dict["docs"] = docs

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        error = d.pop("error", UNSET)

        message = d.pop("message", UNSET)

        suggestion = d.pop("suggestion", UNSET)

        docs = d.pop("docs", UNSET)

        error = cls(
            error=error,
            message=message,
            suggestion=suggestion,
            docs=docs,
        )

        error.additional_properties = d
        return error

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
