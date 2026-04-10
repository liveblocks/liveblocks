from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.initialize_storage_document_body_data import InitializeStorageDocumentBodyData


@_attrs_define
class InitializeStorageDocumentBody:
    """
    Attributes:
        liveblocks_type (Literal['LiveObject']):
        data (InitializeStorageDocumentBodyData):
    """

    liveblocks_type: Literal["LiveObject"]
    data: InitializeStorageDocumentBodyData
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        liveblocks_type = self.liveblocks_type

        data = self.data.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "liveblocksType": liveblocks_type,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.initialize_storage_document_body_data import InitializeStorageDocumentBodyData

        d = dict(src_dict)
        liveblocks_type = cast(Literal["LiveObject"], d.pop("liveblocksType"))
        if liveblocks_type != "LiveObject":
            raise ValueError(f"liveblocksType must match const 'LiveObject', got '{liveblocks_type}'")

        data = InitializeStorageDocumentBodyData.from_dict(d.pop("data"))

        initialize_storage_document_body = cls(
            liveblocks_type=liveblocks_type,
            data=data,
        )

        initialize_storage_document_body.additional_properties = d
        return initialize_storage_document_body

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
