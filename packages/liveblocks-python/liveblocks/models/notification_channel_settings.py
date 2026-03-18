from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset


@_attrs_define
class NotificationChannelSettings:
    """
    Example:
        {'thread': True, 'textMention': False, '$customNotification': True}

    Attributes:
        thread (bool | Unset):
        text_mention (bool | Unset):
    """

    thread: bool | Unset = UNSET
    text_mention: bool | Unset = UNSET
    additional_properties: dict[str, bool] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        thread = self.thread

        text_mention = self.text_mention

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if thread is not UNSET:
            field_dict["thread"] = thread
        if text_mention is not UNSET:
            field_dict["textMention"] = text_mention

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        thread = d.pop("thread", UNSET)

        text_mention = d.pop("textMention", UNSET)

        notification_channel_settings = cls(
            thread=thread,
            text_mention=text_mention,
        )

        notification_channel_settings.additional_properties = d
        return notification_channel_settings

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> bool:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: bool) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
