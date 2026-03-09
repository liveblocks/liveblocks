from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.web_knowledge_source_link import WebKnowledgeSourceLink


T = TypeVar("T", bound="GetWebKnowledgeSourceLinksResponse")


@_attrs_define
class GetWebKnowledgeSourceLinksResponse:
    """
    Attributes:
        next_cursor (None | str):
        data (list[WebKnowledgeSourceLink]):
    """

    next_cursor: None | str
    data: list[WebKnowledgeSourceLink]

    def to_dict(self) -> dict[str, Any]:
        next_cursor: None | str
        next_cursor = self.next_cursor

        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "nextCursor": next_cursor,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.web_knowledge_source_link import WebKnowledgeSourceLink

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = WebKnowledgeSourceLink.from_dict(data_item_data)

            data.append(data_item)

        get_web_knowledge_source_links_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_web_knowledge_source_links_response
