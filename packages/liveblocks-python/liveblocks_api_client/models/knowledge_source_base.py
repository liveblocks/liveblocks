from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..models.knowledge_source_base_status import KnowledgeSourceBaseStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="KnowledgeSourceBase")


@_attrs_define
class KnowledgeSourceBase:
    """
    Attributes:
        id (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        last_indexed_at (datetime.datetime):
        status (KnowledgeSourceBaseStatus):
        error_message (str | Unset):
    """

    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    last_indexed_at: datetime.datetime
    status: KnowledgeSourceBaseStatus
    error_message: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        last_indexed_at = self.last_indexed_at.isoformat()

        status = self.status.value

        error_message = self.error_message

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "lastIndexedAt": last_indexed_at,
                "status": status,
            }
        )
        if error_message is not UNSET:
            field_dict["errorMessage"] = error_message

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        created_at = isoparse(d.pop("createdAt"))

        updated_at = isoparse(d.pop("updatedAt"))

        last_indexed_at = isoparse(d.pop("lastIndexedAt"))

        status = KnowledgeSourceBaseStatus(d.pop("status"))

        error_message = d.pop("errorMessage", UNSET)

        knowledge_source_base = cls(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            last_indexed_at=last_indexed_at,
            status=status,
            error_message=error_message,
        )

        return knowledge_source_base
