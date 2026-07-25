from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class StorageFileMultipartUpload:
    """
    Attributes:
        file_id (str):
        upload_id (str):
    """

    file_id: str
    upload_id: str

    def to_dict(self) -> dict[str, Any]:
        file_id = self.file_id

        upload_id = self.upload_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "fileId": file_id,
                "uploadId": upload_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        file_id = d.pop("fileId")

        upload_id = d.pop("uploadId")

        storage_file_multipart_upload = cls(
            file_id=file_id,
            upload_id=upload_id,
        )

        return storage_file_multipart_upload
