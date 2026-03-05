from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.create_yjs_version_response_data import CreateYjsVersionResponseData


T = TypeVar("T", bound="CreateYjsVersionResponse")


@_attrs_define
class CreateYjsVersionResponse:
    """
    Attributes:
        data (CreateYjsVersionResponseData):
    """

    data: CreateYjsVersionResponseData

    def to_dict(self) -> dict[str, Any]:
        data = self.data.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_yjs_version_response_data import CreateYjsVersionResponseData

        d = dict(src_dict)
        data = CreateYjsVersionResponseData.from_dict(d.pop("data"))

        create_yjs_version_response = cls(
            data=data,
        )

        return create_yjs_version_response
