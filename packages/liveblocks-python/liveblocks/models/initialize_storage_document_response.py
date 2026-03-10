from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.initialize_storage_document_response_data import InitializeStorageDocumentResponseData


@_attrs_define
class InitializeStorageDocumentResponse:
    """
    Attributes:
        liveblocks_type (Literal['LiveObject'] | Unset):
        data (InitializeStorageDocumentResponseData | Unset):
    """

    liveblocks_type: Literal["LiveObject"] | Unset = UNSET
    data: InitializeStorageDocumentResponseData | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        liveblocks_type = self.liveblocks_type

        data: dict[str, Any] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = self.data.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if liveblocks_type is not UNSET:
            field_dict["liveblocksType"] = liveblocks_type
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.initialize_storage_document_response_data import InitializeStorageDocumentResponseData

        d = dict(src_dict)
        liveblocks_type = cast(Literal["LiveObject"] | Unset, d.pop("liveblocksType", UNSET))
        if liveblocks_type != "LiveObject" and not isinstance(liveblocks_type, Unset):
            raise ValueError(f"liveblocksType must match const 'LiveObject', got '{liveblocks_type}'")

        _data = d.pop("data", UNSET)
        data: InitializeStorageDocumentResponseData | Unset
        if isinstance(_data, Unset):
            data = UNSET
        else:
            data = InitializeStorageDocumentResponseData.from_dict(_data)

        initialize_storage_document_response = cls(
            liveblocks_type=liveblocks_type,
            data=data,
        )

        initialize_storage_document_response.additional_properties = d
        return initialize_storage_document_response

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
