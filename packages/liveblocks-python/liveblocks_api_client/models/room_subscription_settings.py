from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.room_subscription_settings_text_mentions import RoomSubscriptionSettingsTextMentions
from ..models.room_subscription_settings_threads import RoomSubscriptionSettingsThreads
from ..types import UNSET, Unset

T = TypeVar("T", bound="RoomSubscriptionSettings")


@_attrs_define
class RoomSubscriptionSettings:
    """
    Attributes:
        threads (RoomSubscriptionSettingsThreads | Unset):
        text_mentions (RoomSubscriptionSettingsTextMentions | Unset):
    """

    threads: RoomSubscriptionSettingsThreads | Unset = UNSET
    text_mentions: RoomSubscriptionSettingsTextMentions | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        threads: str | Unset = UNSET
        if not isinstance(self.threads, Unset):
            threads = self.threads.value

        text_mentions: str | Unset = UNSET
        if not isinstance(self.text_mentions, Unset):
            text_mentions = self.text_mentions.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
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
        threads: RoomSubscriptionSettingsThreads | Unset
        if isinstance(_threads, Unset):
            threads = UNSET
        else:
            threads = RoomSubscriptionSettingsThreads(_threads)

        _text_mentions = d.pop("textMentions", UNSET)
        text_mentions: RoomSubscriptionSettingsTextMentions | Unset
        if isinstance(_text_mentions, Unset):
            text_mentions = UNSET
        else:
            text_mentions = RoomSubscriptionSettingsTextMentions(_text_mentions)

        room_subscription_settings = cls(
            threads=threads,
            text_mentions=text_mentions,
        )

        room_subscription_settings.additional_properties = d
        return room_subscription_settings

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
