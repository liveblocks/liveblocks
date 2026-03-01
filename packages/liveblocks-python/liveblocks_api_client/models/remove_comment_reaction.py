from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="RemoveCommentReaction")


@_attrs_define
class RemoveCommentReaction:
    """
    Attributes:
        user_id (str):
        emoji (str):
        removed_at (datetime.datetime | Unset):
    """

    user_id: str
    emoji: str
    removed_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        emoji = self.emoji

        removed_at: str | Unset = UNSET
        if not isinstance(self.removed_at, Unset):
            removed_at = self.removed_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "userId": user_id,
                "emoji": emoji,
            }
        )
        if removed_at is not UNSET:
            field_dict["removedAt"] = removed_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        user_id = d.pop("userId")

        emoji = d.pop("emoji")

        _removed_at = d.pop("removedAt", UNSET)
        removed_at: datetime.datetime | Unset
        if isinstance(_removed_at, Unset):
            removed_at = UNSET
        else:
            removed_at = isoparse(_removed_at)

        remove_comment_reaction = cls(
            user_id=user_id,
            emoji=emoji,
            removed_at=removed_at,
        )

        remove_comment_reaction.additional_properties = d
        return remove_comment_reaction

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
