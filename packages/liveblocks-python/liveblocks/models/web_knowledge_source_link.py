from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..models.web_knowledge_source_link_status import WebKnowledgeSourceLinkStatus


@_attrs_define
class WebKnowledgeSourceLink:
    """
    Example:
        {'id': 'ksl_abc123', 'url': 'https://docs.example.com/getting-started', 'status': 'ready', 'createdAt':
            '2024-06-01T12:00:00.000Z', 'lastIndexedAt': '2024-06-01T12:00:00.000Z'}

    Attributes:
        id (str):
        url (str):
        status (WebKnowledgeSourceLinkStatus):
        created_at (datetime.datetime):
        last_indexed_at (datetime.datetime):
    """

    id: str
    url: str
    status: WebKnowledgeSourceLinkStatus
    created_at: datetime.datetime
    last_indexed_at: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        url = self.url

        status = self.status.value

        created_at = self.created_at.isoformat()

        last_indexed_at = self.last_indexed_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "url": url,
                "status": status,
                "createdAt": created_at,
                "lastIndexedAt": last_indexed_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        url = d.pop("url")

        status = WebKnowledgeSourceLinkStatus(d.pop("status"))

        created_at = isoparse(d.pop("createdAt"))

        last_indexed_at = isoparse(d.pop("lastIndexedAt"))

        web_knowledge_source_link = cls(
            id=id,
            url=url,
            status=status,
            created_at=created_at,
            last_indexed_at=last_indexed_at,
        )

        return web_knowledge_source_link
