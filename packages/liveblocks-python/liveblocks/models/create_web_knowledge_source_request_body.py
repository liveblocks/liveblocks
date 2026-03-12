from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.create_web_knowledge_source_request_body_type import CreateWebKnowledgeSourceRequestBodyType


@_attrs_define
class CreateWebKnowledgeSourceRequestBody:
    """
    Example:
        {'copilotId': 'cp_abc123', 'url': 'https://docs.example.com', 'type': 'crawl'}

    Attributes:
        copilot_id (str):
        url (str):
        type_ (CreateWebKnowledgeSourceRequestBodyType):
    """

    copilot_id: str
    url: str
    type_: CreateWebKnowledgeSourceRequestBodyType
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        copilot_id = self.copilot_id

        url = self.url

        type_ = self.type_.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "copilotId": copilot_id,
                "url": url,
                "type": type_,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        copilot_id = d.pop("copilotId")

        url = d.pop("url")

        type_ = CreateWebKnowledgeSourceRequestBodyType(d.pop("type"))

        create_web_knowledge_source_request_body = cls(
            copilot_id=copilot_id,
            url=url,
            type_=type_,
        )

        create_web_knowledge_source_request_body.additional_properties = d
        return create_web_knowledge_source_request_body

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
