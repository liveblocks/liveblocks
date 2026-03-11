from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class MarkThreadAsResolvedRequestBody:
    """
    Attributes:
        user_id (str): The user ID of the user who marked the thread as resolved.
    """

    user_id: str

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "userId": user_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        user_id = d.pop("userId")

        mark_thread_as_resolved_request_body = cls(
            user_id=user_id,
        )

        return mark_thread_as_resolved_request_body
