from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.knowledge_source_web_source_link_type import KnowledgeSourceWebSourceLinkType


@_attrs_define
class KnowledgeSourceWebSourceLink:
    """
    Attributes:
        url (str):
        type_ (KnowledgeSourceWebSourceLinkType):
    """

    url: str
    type_: KnowledgeSourceWebSourceLinkType
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        url = self.url

        type_ = self.type_.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "url": url,
                "type": type_,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        url = d.pop("url")

        type_ = KnowledgeSourceWebSourceLinkType(d.pop("type"))

        knowledge_source_web_source_link = cls(
            url=url,
            type_=type_,
        )

        knowledge_source_web_source_link.additional_properties = d
        return knowledge_source_web_source_link

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
