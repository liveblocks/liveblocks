from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.file_knowledge_source import FileKnowledgeSource
    from ..models.web_knowledge_source import WebKnowledgeSource


T = TypeVar("T", bound="GetKnowledgeSources")


@_attrs_define
class GetKnowledgeSources:
    """
    Attributes:
        next_cursor (str | Unset):
        data (list[FileKnowledgeSource | WebKnowledgeSource] | Unset):
    """

    next_cursor: str | Unset = UNSET
    data: list[FileKnowledgeSource | WebKnowledgeSource] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.web_knowledge_source import WebKnowledgeSource

        next_cursor = self.next_cursor

        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item: dict[str, Any]
                if isinstance(data_item_data, WebKnowledgeSource):
                    data_item = data_item_data.to_dict()
                else:
                    data_item = data_item_data.to_dict()

                data.append(data_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if next_cursor is not UNSET:
            field_dict["nextCursor"] = next_cursor
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.file_knowledge_source import FileKnowledgeSource
        from ..models.web_knowledge_source import WebKnowledgeSource

        d = dict(src_dict)
        next_cursor = d.pop("nextCursor", UNSET)

        _data = d.pop("data", UNSET)
        data: list[FileKnowledgeSource | WebKnowledgeSource] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:

                def _parse_data_item(data: object) -> FileKnowledgeSource | WebKnowledgeSource:
                    try:
                        if not isinstance(data, dict):
                            raise TypeError()
                        componentsschemas_knowledge_source_web_knowledge_source = WebKnowledgeSource.from_dict(data)

                        return componentsschemas_knowledge_source_web_knowledge_source
                    except (TypeError, ValueError, AttributeError, KeyError):
                        pass
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_knowledge_source_file_knowledge_source = FileKnowledgeSource.from_dict(data)

                    return componentsschemas_knowledge_source_file_knowledge_source

                data_item = _parse_data_item(data_item_data)

                data.append(data_item)

        get_knowledge_sources = cls(
            next_cursor=next_cursor,
            data=data,
        )

        get_knowledge_sources.additional_properties = d
        return get_knowledge_sources

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
