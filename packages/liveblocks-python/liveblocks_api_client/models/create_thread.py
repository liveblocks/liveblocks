from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_thread_comment import CreateThreadComment
    from ..models.create_thread_metadata import CreateThreadMetadata


T = TypeVar("T", bound="CreateThread")


@_attrs_define
class CreateThread:
    """
    Attributes:
        comment (CreateThreadComment):
        metadata (CreateThreadMetadata | Unset):
    """

    comment: CreateThreadComment
    metadata: CreateThreadMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        comment = self.comment.to_dict()

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "comment": comment,
            }
        )
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_thread_comment import CreateThreadComment
        from ..models.create_thread_metadata import CreateThreadMetadata

        d = dict(src_dict)
        comment = CreateThreadComment.from_dict(d.pop("comment"))

        _metadata = d.pop("metadata", UNSET)
        metadata: CreateThreadMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = CreateThreadMetadata.from_dict(_metadata)

        create_thread = cls(
            comment=comment,
            metadata=metadata,
        )

        create_thread.additional_properties = d
        return create_thread

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
