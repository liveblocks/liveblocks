from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class GetFileKnowledgeSourceMarkdownResponse:
    """
    Attributes:
        id (str):
        content (str):
    """

    id: str
    content: str

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        content = self.content

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "content": content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        content = d.pop("content")

        get_file_knowledge_source_markdown_response = cls(
            id=id,
            content=content,
        )

        return get_file_knowledge_source_markdown_response
