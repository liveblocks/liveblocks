from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_thread_comment_body_content_item import CreateThreadCommentBodyContentItem


T = TypeVar("T", bound="CreateThreadCommentBody")


@_attrs_define
class CreateThreadCommentBody:
    """
    Attributes:
        version (float | Unset):
        content (list[CreateThreadCommentBodyContentItem] | Unset):
    """

    version: float | Unset = UNSET
    content: list[CreateThreadCommentBodyContentItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        content: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.content, Unset):
            content = []
            for content_item_data in self.content:
                content_item = content_item_data.to_dict()
                content.append(content_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if version is not UNSET:
            field_dict["version"] = version
        if content is not UNSET:
            field_dict["content"] = content

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_thread_comment_body_content_item import CreateThreadCommentBodyContentItem

        d = dict(src_dict)
        version = d.pop("version", UNSET)

        _content = d.pop("content", UNSET)
        content: list[CreateThreadCommentBodyContentItem] | Unset = UNSET
        if _content is not UNSET:
            content = []
            for content_item_data in _content:
                content_item = CreateThreadCommentBodyContentItem.from_dict(content_item_data)

                content.append(content_item)

        create_thread_comment_body = cls(
            version=version,
            content=content,
        )

        create_thread_comment_body.additional_properties = d
        return create_thread_comment_body

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
