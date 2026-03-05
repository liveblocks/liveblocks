from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="CreateYjsVersionResponseData")


@_attrs_define
class CreateYjsVersionResponseData:
    """
    Attributes:
        id (str): Unique identifier for the created version
    """

    id: str

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        create_yjs_version_response_data = cls(
            id=id,
        )

        return create_yjs_version_response_data
