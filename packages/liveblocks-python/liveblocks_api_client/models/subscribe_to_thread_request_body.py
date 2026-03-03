from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="SubscribeToThreadRequestBody")


@_attrs_define
class SubscribeToThreadRequestBody:
    """
    Attributes:
        user_id (str):
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
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        user_id = d.pop("userId")

        subscribe_to_thread_request_body = cls(
            user_id=user_id,
        )

        return subscribe_to_thread_request_body
