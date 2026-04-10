from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.create_yjs_version_response_data import CreateYjsVersionResponseData


@_attrs_define
class CreateYjsVersionResponse:
    """
    Example:
        {'data': {'id': 'vh_abc123'}}

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
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.create_yjs_version_response_data import CreateYjsVersionResponseData

        d = dict(src_dict)
        data = CreateYjsVersionResponseData.from_dict(d.pop("data"))

        create_yjs_version_response = cls(
            data=data,
        )

        return create_yjs_version_response
