from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Literal, Self, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse


@_attrs_define
class AttachmentWithUrl:
    """
    Example:
        {'type': 'attachment', 'id': 'at_abc123', 'mimeType': 'image/png', 'name': 'screenshot.png', 'size': 12345,
            'url': 'https://example.com/at_abc123?X-Amz-Expires=3600&X-Amz-Signature=...', 'expiresAt':
            '2026-03-16T14:00:00.000Z'}

    Attributes:
        type_ (Literal['attachment']):
        id (str):
        mime_type (str):
        name (str):
        size (int):
        url (str): Presigned download URL for the attachment
        expires_at (datetime.datetime): ISO 8601 timestamp when the presigned URL expires
    """

    type_: Literal["attachment"]
    id: str
    mime_type: str
    name: str
    size: int
    url: str
    expires_at: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        id = self.id

        mime_type = self.mime_type

        name = self.name

        size = self.size

        url = self.url

        expires_at = self.expires_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "type": type_,
                "id": id,
                "mimeType": mime_type,
                "name": name,
                "size": size,
                "url": url,
                "expiresAt": expires_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        type_ = cast(Literal["attachment"], d.pop("type"))
        if type_ != "attachment":
            raise ValueError(f"type must match const 'attachment', got '{type_}'")

        id = d.pop("id")

        mime_type = d.pop("mimeType")

        name = d.pop("name")

        size = d.pop("size")

        url = d.pop("url")

        expires_at = isoparse(d.pop("expiresAt"))

        attachment_with_url = cls(
            type_=type_,
            id=id,
            mime_type=mime_type,
            name=name,
            size=size,
            url=url,
            expires_at=expires_at,
        )

        return attachment_with_url
