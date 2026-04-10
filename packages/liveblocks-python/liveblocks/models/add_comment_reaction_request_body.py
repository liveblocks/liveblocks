from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset


@_attrs_define
class AddCommentReactionRequestBody:
    """
    Attributes:
        user_id (str):
        emoji (str):
        created_at (datetime.datetime | Unset):
    """

    user_id: str
    emoji: str
    created_at: datetime.datetime | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        emoji = self.emoji

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "userId": user_id,
                "emoji": emoji,
            }
        )
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        user_id = d.pop("userId")

        emoji = d.pop("emoji")

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = isoparse(_created_at)

        add_comment_reaction_request_body = cls(
            user_id=user_id,
            emoji=emoji,
            created_at=created_at,
        )

        return add_comment_reaction_request_body
