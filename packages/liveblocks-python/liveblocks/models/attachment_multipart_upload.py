from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class AttachmentMultipartUpload:
    """
    Attributes:
        attachment_id (str):
        upload_id (str):
    """

    attachment_id: str
    upload_id: str

    def to_dict(self) -> dict[str, Any]:
        attachment_id = self.attachment_id

        upload_id = self.upload_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "attachmentId": attachment_id,
                "uploadId": upload_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        attachment_id = d.pop("attachmentId")

        upload_id = d.pop("uploadId")

        attachment_multipart_upload = cls(
            attachment_id=attachment_id,
            upload_id=upload_id,
        )

        return attachment_multipart_upload
