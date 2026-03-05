from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="RemoveCommentReactionRequestBody")


@_attrs_define
class RemoveCommentReactionRequestBody:
    """
    Attributes:
        user_id (str):
        emoji (str):
        removed_at (datetime.datetime | Unset):
    """

    user_id: str
    emoji: str
    removed_at: datetime.datetime | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        emoji = self.emoji

        removed_at: str | Unset = UNSET
        if not isinstance(self.removed_at, Unset):
            removed_at = self.removed_at.isoformat()

        field_dict: dict[str, Any] = {}

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

        remove_comment_reaction_request_body = cls(
            user_id=user_id,
            emoji=emoji,
            removed_at=removed_at,
        )

        return remove_comment_reaction_request_body
