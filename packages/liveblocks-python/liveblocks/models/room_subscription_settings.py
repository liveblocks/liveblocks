from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define

from ..models.room_subscription_settings_text_mentions import RoomSubscriptionSettingsTextMentions
from ..models.room_subscription_settings_threads import RoomSubscriptionSettingsThreads


@_attrs_define
class RoomSubscriptionSettings:
    """
    Example:
        {'threads': 'all', 'textMentions': 'mine'}

    Attributes:
        threads (RoomSubscriptionSettingsThreads):
        text_mentions (RoomSubscriptionSettingsTextMentions):
    """

    threads: RoomSubscriptionSettingsThreads
    text_mentions: RoomSubscriptionSettingsTextMentions

    def to_dict(self) -> dict[str, Any]:
        threads = self.threads.value

        text_mentions = self.text_mentions.value

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "threads": threads,
                "textMentions": text_mentions,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        threads = RoomSubscriptionSettingsThreads(d.pop("threads"))

        text_mentions = RoomSubscriptionSettingsTextMentions(d.pop("textMentions"))

        room_subscription_settings = cls(
            threads=threads,
            text_mentions=text_mentions,
        )

        return room_subscription_settings
