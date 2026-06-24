from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

if TYPE_CHECKING:
    from ..models.history_version_authors_item import HistoryVersionAuthorsItem


@_attrs_define
class HistoryVersion:
    """
    Example:
        {'id': 'vh_abc123', 'createdAt': '2024-10-15T10:30:00.000Z', 'authors': [{'id': 'user-123'}, {'id':
            'user-456'}]}

    Attributes:
        id (str): Unique identifier for the version
        created_at (datetime.datetime): ISO 8601 timestamp of when the version was created
        authors (list[HistoryVersionAuthorsItem]): List of users who contributed to this version
    """

    id: str
    created_at: datetime.datetime
    authors: list[HistoryVersionAuthorsItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        created_at = self.created_at.isoformat()

        authors = []
        for authors_item_data in self.authors:
            authors_item = authors_item_data.to_dict()
            authors.append(authors_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "createdAt": created_at,
                "authors": authors,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.history_version_authors_item import HistoryVersionAuthorsItem

        d = dict(src_dict)
        id = d.pop("id")

        created_at = isoparse(d.pop("createdAt"))

        authors = []
        _authors = d.pop("authors")
        for authors_item_data in _authors:
            authors_item = HistoryVersionAuthorsItem.from_dict(authors_item_data)

            authors.append(authors_item)

        history_version = cls(
            id=id,
            created_at=created_at,
            authors=authors,
        )

        history_version.additional_properties = d
        return history_version

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
