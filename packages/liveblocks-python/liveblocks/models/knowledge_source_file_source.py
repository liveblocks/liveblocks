from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.knowledge_source_base_status import KnowledgeSourceBaseStatus
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.knowledge_source_file_source_file import KnowledgeSourceFileSourceFile


@_attrs_define
class KnowledgeSourceFileSource:
    """
    Attributes:
        id (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        last_indexed_at (datetime.datetime):
        status (KnowledgeSourceBaseStatus):
        type_ (Literal['ai-knowledge-file-source']):
        file (KnowledgeSourceFileSourceFile):
        error_message (str | Unset):
    """

    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    last_indexed_at: datetime.datetime
    status: KnowledgeSourceBaseStatus
    type_: Literal["ai-knowledge-file-source"]
    file: KnowledgeSourceFileSourceFile
    error_message: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        last_indexed_at = self.last_indexed_at.isoformat()

        status = self.status.value

        type_ = self.type_

        file = self.file.to_dict()

        error_message = self.error_message

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "lastIndexedAt": last_indexed_at,
                "status": status,
                "type": type_,
                "file": file,
            }
        )
        if error_message is not UNSET:
            field_dict["errorMessage"] = error_message

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.knowledge_source_file_source_file import KnowledgeSourceFileSourceFile

        d = dict(src_dict)
        id = d.pop("id")

        created_at = isoparse(d.pop("createdAt"))

        updated_at = isoparse(d.pop("updatedAt"))

        last_indexed_at = isoparse(d.pop("lastIndexedAt"))

        status = KnowledgeSourceBaseStatus(d.pop("status"))

        type_ = cast(Literal["ai-knowledge-file-source"], d.pop("type"))
        if type_ != "ai-knowledge-file-source":
            raise ValueError(f"type must match const 'ai-knowledge-file-source', got '{type_}'")

        file = KnowledgeSourceFileSourceFile.from_dict(d.pop("file"))

        error_message = d.pop("errorMessage", UNSET)

        knowledge_source_file_source = cls(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            last_indexed_at=last_indexed_at,
            status=status,
            type_=type_,
            file=file,
            error_message=error_message,
        )

        knowledge_source_file_source.additional_properties = d
        return knowledge_source_file_source

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
