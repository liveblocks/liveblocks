from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define

from ..models.user_room_subscription_settings_text_mentions import UserRoomSubscriptionSettingsTextMentions
from ..models.user_room_subscription_settings_threads import UserRoomSubscriptionSettingsThreads


@_attrs_define
class UserRoomSubscriptionSettings:
    """
    Attributes:
        threads (UserRoomSubscriptionSettingsThreads):
        text_mentions (UserRoomSubscriptionSettingsTextMentions):
        room_id (str):
    """

    threads: UserRoomSubscriptionSettingsThreads
    text_mentions: UserRoomSubscriptionSettingsTextMentions
    room_id: str

    def to_dict(self) -> dict[str, Any]:
        threads = self.threads.value

        text_mentions = self.text_mentions.value

        room_id = self.room_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "threads": threads,
                "textMentions": text_mentions,
                "roomId": room_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        threads = UserRoomSubscriptionSettingsThreads(d.pop("threads"))

        text_mentions = UserRoomSubscriptionSettingsTextMentions(d.pop("textMentions"))

        room_id = d.pop("roomId")

        user_room_subscription_settings = cls(
            threads=threads,
            text_mentions=text_mentions,
            room_id=room_id,
        )

        return user_room_subscription_settings
