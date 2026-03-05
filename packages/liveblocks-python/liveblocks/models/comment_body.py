from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.comment_body_content_item import CommentBodyContentItem


T = TypeVar("T", bound="CommentBody")


@_attrs_define
class CommentBody:
    """
    Attributes:
        version (float):
        content (list[CommentBodyContentItem]):
    """

    version: float
    content: list[CommentBodyContentItem]

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        content = []
        for content_item_data in self.content:
            content_item = content_item_data.to_dict()
            content.append(content_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "version": version,
                "content": content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.comment_body_content_item import CommentBodyContentItem

        d = dict(src_dict)
        version = d.pop("version")

        content = []
        _content = d.pop("content")
        for content_item_data in _content:
            content_item = CommentBodyContentItem.from_dict(content_item_data)

            content.append(content_item)

        comment_body = cls(
            version=version,
            content=content,
        )

        return comment_body
