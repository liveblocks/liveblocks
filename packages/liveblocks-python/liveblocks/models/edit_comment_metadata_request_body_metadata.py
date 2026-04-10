from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field


@_attrs_define
class EditCommentMetadataRequestBodyMetadata:
    """ """

    additional_properties: dict[str, bool | float | None | str] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():
            field_dict[prop_name] = prop

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        edit_comment_metadata_request_body_metadata = cls()

        additional_properties = {}
        for prop_name, prop_dict in d.items():

            def _parse_additional_property(data: object) -> bool | float | None | str:
                if data is None:
                    return data
                return cast(bool | float | None | str, data)

            additional_property = _parse_additional_property(prop_dict)

            additional_properties[prop_name] = additional_property

        edit_comment_metadata_request_body_metadata.additional_properties = additional_properties
        return edit_comment_metadata_request_body_metadata

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> bool | float | None | str:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: bool | float | None | str) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
