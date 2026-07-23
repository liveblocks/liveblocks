from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from dateutil.parser import isoparse


@_attrs_define
class StorageFileWithUrl:
    """Uploaded Storage file metadata with a temporary download URL.

    Attributes:
        id (str):
        name (str):
        size (int):
        mime_type (str):
        url (str): Presigned download URL
        expires_at (datetime.datetime): Expiration time of the presigned URL
    """

    id: str
    name: str
    size: int
    mime_type: str
    url: str
    expires_at: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        size = self.size

        mime_type = self.mime_type

        url = self.url

        expires_at = self.expires_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "name": name,
                "size": size,
                "mimeType": mime_type,
                "url": url,
                "expiresAt": expires_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        size = d.pop("size")

        mime_type = d.pop("mimeType")

        url = d.pop("url")

        expires_at = isoparse(d.pop("expiresAt"))

        storage_file_with_url = cls(
            id=id,
            name=name,
            size=size,
            mime_type=mime_type,
            url=url,
            expires_at=expires_at,
        )

        return storage_file_with_url
