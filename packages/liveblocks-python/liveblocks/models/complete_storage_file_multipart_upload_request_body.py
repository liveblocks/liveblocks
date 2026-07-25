from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.storage_file_multipart_part import StorageFileMultipartPart


@_attrs_define
class CompleteStorageFileMultipartUploadRequestBody:
    """
    Attributes:
        parts (list[StorageFileMultipartPart]):
    """

    parts: list[StorageFileMultipartPart]

    def to_dict(self) -> dict[str, Any]:
        parts = []
        for parts_item_data in self.parts:
            parts_item = parts_item_data.to_dict()
            parts.append(parts_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "parts": parts,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.storage_file_multipart_part import StorageFileMultipartPart

        d = dict(src_dict)
        parts = []
        _parts = d.pop("parts")
        for parts_item_data in _parts:
            parts_item = StorageFileMultipartPart.from_dict(parts_item_data)

            parts.append(parts_item)

        complete_storage_file_multipart_upload_request_body = cls(
            parts=parts,
        )

        return complete_storage_file_multipart_upload_request_body
