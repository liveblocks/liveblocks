from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..models.update_room_subscription_settings_request_body_text_mentions import (
    UpdateRoomSubscriptionSettingsRequestBodyTextMentions,
)
from ..models.update_room_subscription_settings_request_body_threads import (
    UpdateRoomSubscriptionSettingsRequestBodyThreads,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="UpdateRoomSubscriptionSettingsRequestBody")


@_attrs_define
class UpdateRoomSubscriptionSettingsRequestBody:
    """Partial room subscription settings - all properties are optional

    Attributes:
        threads (UpdateRoomSubscriptionSettingsRequestBodyThreads | Unset):
        text_mentions (UpdateRoomSubscriptionSettingsRequestBodyTextMentions | Unset):
    """

    threads: UpdateRoomSubscriptionSettingsRequestBodyThreads | Unset = UNSET
    text_mentions: UpdateRoomSubscriptionSettingsRequestBodyTextMentions | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        threads: str | Unset = UNSET
        if not isinstance(self.threads, Unset):
            threads = self.threads.value

        text_mentions: str | Unset = UNSET
        if not isinstance(self.text_mentions, Unset):
            text_mentions = self.text_mentions.value

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if threads is not UNSET:
            field_dict["threads"] = threads
        if text_mentions is not UNSET:
            field_dict["textMentions"] = text_mentions

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _threads = d.pop("threads", UNSET)
        threads: UpdateRoomSubscriptionSettingsRequestBodyThreads | Unset
        if isinstance(_threads, Unset):
            threads = UNSET
        else:
            threads = UpdateRoomSubscriptionSettingsRequestBodyThreads(_threads)

        _text_mentions = d.pop("textMentions", UNSET)
        text_mentions: UpdateRoomSubscriptionSettingsRequestBodyTextMentions | Unset
        if isinstance(_text_mentions, Unset):
            text_mentions = UNSET
        else:
            text_mentions = UpdateRoomSubscriptionSettingsRequestBodyTextMentions(_text_mentions)

        update_room_subscription_settings_request_body = cls(
            threads=threads,
            text_mentions=text_mentions,
        )

        return update_room_subscription_settings_request_body
