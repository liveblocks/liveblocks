from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.yjs_version_authors_item import YjsVersionAuthorsItem


T = TypeVar("T", bound="YjsVersion")


@_attrs_define
class YjsVersion:
    """
    Attributes:
        id (str): Unique identifier for the version
        type_ (Literal['historyVersion']):
        created_at (datetime.datetime): ISO 8601 timestamp of when the version was created
        kind (Literal['yjs']):
        authors (list[YjsVersionAuthorsItem] | Unset): List of users who contributed to this version
    """

    id: str
    type_: Literal["historyVersion"]
    created_at: datetime.datetime
    kind: Literal["yjs"]
    authors: list[YjsVersionAuthorsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        type_ = self.type_

        created_at = self.created_at.isoformat()

        kind = self.kind

        authors: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.authors, Unset):
            authors = []
            for authors_item_data in self.authors:
                authors_item = authors_item_data.to_dict()
                authors.append(authors_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "type": type_,
                "createdAt": created_at,
                "kind": kind,
            }
        )
        if authors is not UNSET:
            field_dict["authors"] = authors

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.yjs_version_authors_item import YjsVersionAuthorsItem

        d = dict(src_dict)
        id = d.pop("id")

        type_ = cast(Literal["historyVersion"], d.pop("type"))
        if type_ != "historyVersion":
            raise ValueError(f"type must match const 'historyVersion', got '{type_}'")

        created_at = isoparse(d.pop("createdAt"))

        kind = cast(Literal["yjs"], d.pop("kind"))
        if kind != "yjs":
            raise ValueError(f"kind must match const 'yjs', got '{kind}'")

        _authors = d.pop("authors", UNSET)
        authors: list[YjsVersionAuthorsItem] | Unset = UNSET
        if _authors is not UNSET:
            authors = []
            for authors_item_data in _authors:
                authors_item = YjsVersionAuthorsItem.from_dict(authors_item_data)

                authors.append(authors_item)

        yjs_version = cls(
            id=id,
            type_=type_,
            created_at=created_at,
            kind=kind,
            authors=authors,
        )

        yjs_version.additional_properties = d
        return yjs_version

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
