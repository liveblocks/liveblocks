from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from dateutil.parser import isoparse


@_attrs_define
class CommentReaction:
    """
    Attributes:
        user_id (str):
        created_at (datetime.datetime):
        emoji (str):
    """

    user_id: str
    created_at: datetime.datetime
    emoji: str

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        created_at = self.created_at.isoformat()

        emoji = self.emoji

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "userId": user_id,
                "createdAt": created_at,
                "emoji": emoji,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        user_id = d.pop("userId")

        created_at = isoparse(d.pop("createdAt"))

        emoji = d.pop("emoji")

        comment_reaction = cls(
            user_id=user_id,
            created_at=created_at,
            emoji=emoji,
        )

        return comment_reaction
