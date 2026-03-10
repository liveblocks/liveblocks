from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, Self, cast

from attrs import define as _attrs_define


@_attrs_define
class CommentAttachment:
    """
    Attributes:
        type_ (Literal['attachment']):
        id (str):
        mime_type (str):
        name (str):
        size (int):
    """

    type_: Literal["attachment"]
    id: str
    mime_type: str
    name: str
    size: int

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        id = self.id

        mime_type = self.mime_type

        name = self.name

        size = self.size

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "type": type_,
                "id": id,
                "mimeType": mime_type,
                "name": name,
                "size": size,
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

        comment_attachment = cls(
            type_=type_,
            id=id,
            mime_type=mime_type,
            name=name,
            size=size,
        )

        return comment_attachment
