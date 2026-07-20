from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class LiveFileData:
    """Immutable reference to a file from Storage stored inside a LiveFile node.

    Attributes:
        id (str): ID of the uploaded Storage file Example: fl_abc123456789012345678.
        name (str): Original file name Example: photo.png.
        size (int): File size in bytes Example: 12345.
        mime_type (str): File MIME type Example: image/png.
    """

    id: str
    name: str
    size: int
    mime_type: str

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        size = self.size

        mime_type = self.mime_type

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "name": name,
                "size": size,
                "mimeType": mime_type,
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

        live_file_data = cls(
            id=id,
            name=name,
            size=size,
            mime_type=mime_type,
        )

        return live_file_data
