from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.knowledge_source_file_source import KnowledgeSourceFileSource
    from ..models.knowledge_source_web_source import KnowledgeSourceWebSource


T = TypeVar("T", bound="GetKnowledgeSourcesResponse")


@_attrs_define
class GetKnowledgeSourcesResponse:
    """
    Attributes:
        next_cursor (None | str):
        data (list[KnowledgeSourceFileSource | KnowledgeSourceWebSource]):
    """

    next_cursor: None | str
    data: list[KnowledgeSourceFileSource | KnowledgeSourceWebSource]

    def to_dict(self) -> dict[str, Any]:
        from ..models.knowledge_source_web_source import KnowledgeSourceWebSource

        next_cursor: None | str
        next_cursor = self.next_cursor

        data = []
        for data_item_data in self.data:
            data_item: dict[str, Any]
            if isinstance(data_item_data, KnowledgeSourceWebSource):
                data_item = data_item_data.to_dict()
            else:
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
        from ..models.knowledge_source_file_source import KnowledgeSourceFileSource
        from ..models.knowledge_source_web_source import KnowledgeSourceWebSource

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:

            def _parse_data_item(data: object) -> KnowledgeSourceFileSource | KnowledgeSourceWebSource:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_knowledge_source_type_0 = KnowledgeSourceWebSource.from_dict(data)

                    return componentsschemas_knowledge_source_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_knowledge_source_type_1 = KnowledgeSourceFileSource.from_dict(data)

                return componentsschemas_knowledge_source_type_1

            data_item = _parse_data_item(data_item_data)

            data.append(data_item)

        get_knowledge_sources_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_knowledge_sources_response
