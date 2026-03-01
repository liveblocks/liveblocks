from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.get_yjs_versions_data_item_kind import GetYjsVersionsDataItemKind
from ..models.get_yjs_versions_data_item_type import GetYjsVersionsDataItemType

if TYPE_CHECKING:
    from ..models.get_yjs_versions_data_item_authors_item import GetYjsVersionsDataItemAuthorsItem


T = TypeVar("T", bound="GetYjsVersionsDataItem")


@_attrs_define
class GetYjsVersionsDataItem:
    """
    Attributes:
        type_ (GetYjsVersionsDataItemType): Type identifier for the version history object
        id (str): Unique identifier for the version
        created_at (datetime.datetime): ISO 8601 timestamp of when the version was created
        authors (list[GetYjsVersionsDataItemAuthorsItem]): List of users who contributed to this version
        kind (GetYjsVersionsDataItemKind): Type of document (yjs for Yjs documents)
    """

    type_: GetYjsVersionsDataItemType
    id: str
    created_at: datetime.datetime
    authors: list[GetYjsVersionsDataItemAuthorsItem]
    kind: GetYjsVersionsDataItemKind
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        id = self.id

        created_at = self.created_at.isoformat()

        authors = []
        for authors_item_data in self.authors:
            authors_item = authors_item_data.to_dict()
            authors.append(authors_item)

        kind = self.kind.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "id": id,
                "createdAt": created_at,
                "authors": authors,
                "kind": kind,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_yjs_versions_data_item_authors_item import GetYjsVersionsDataItemAuthorsItem

        d = dict(src_dict)
        type_ = GetYjsVersionsDataItemType(d.pop("type"))

        id = d.pop("id")

        created_at = isoparse(d.pop("createdAt"))

        authors = []
        _authors = d.pop("authors")
        for authors_item_data in _authors:
            authors_item = GetYjsVersionsDataItemAuthorsItem.from_dict(authors_item_data)

            authors.append(authors_item)

        kind = GetYjsVersionsDataItemKind(d.pop("kind"))

        get_yjs_versions_data_item = cls(
            type_=type_,
            id=id,
            created_at=created_at,
            authors=authors,
            kind=kind,
        )

        get_yjs_versions_data_item.additional_properties = d
        return get_yjs_versions_data_item

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
