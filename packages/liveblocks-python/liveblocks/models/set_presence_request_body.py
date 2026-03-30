from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.set_presence_request_body_data import SetPresenceRequestBodyData
    from ..models.set_presence_request_body_user_info import SetPresenceRequestBodyUserInfo


@_attrs_define
class SetPresenceRequestBody:
    """
    Example:
        {'userId': 'agent-123', 'data': {'status': 'active', 'cursor': {'x': 100, 'y': 200}}, 'userInfo': {'name': 'AI
            Assistant', 'avatar': 'https://example.org/images/agent123.jpg'}, 'ttl': 60}

    Attributes:
        user_id (str): ID of the user to set presence for
        data (SetPresenceRequestBodyData): Presence data as a JSON object
        user_info (SetPresenceRequestBodyUserInfo): Metadata about the user or agent
        ttl (int | Unset): Time-to-live in seconds (minimum: 2, maximum: 3599). After this duration, the presence will
            automatically expire.
    """

    user_id: str
    data: SetPresenceRequestBodyData
    user_info: SetPresenceRequestBodyUserInfo
    ttl: int | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        data = self.data.to_dict()

        user_info = self.user_info.to_dict()

        ttl = self.ttl

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "userId": user_id,
                "data": data,
                "userInfo": user_info,
            }
        )
        if ttl is not UNSET:
            field_dict["ttl"] = ttl

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.set_presence_request_body_data import SetPresenceRequestBodyData
        from ..models.set_presence_request_body_user_info import SetPresenceRequestBodyUserInfo

        d = dict(src_dict)
        user_id = d.pop("userId")

        data = SetPresenceRequestBodyData.from_dict(d.pop("data"))

        user_info = SetPresenceRequestBodyUserInfo.from_dict(d.pop("userInfo"))

        ttl = d.pop("ttl", UNSET)

        set_presence_request_body = cls(
            user_id=user_id,
            data=data,
            user_info=user_info,
            ttl=ttl,
        )

        return set_presence_request_body
