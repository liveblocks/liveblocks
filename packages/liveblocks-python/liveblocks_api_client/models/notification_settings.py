from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.notification_channel_settings import NotificationChannelSettings


T = TypeVar("T", bound="NotificationSettings")


@_attrs_define
class NotificationSettings:
    """Notification settings for each supported channel

    Attributes:
        email (NotificationChannelSettings | Unset):
        slack (NotificationChannelSettings | Unset):
        teams (NotificationChannelSettings | Unset):
        web_push (NotificationChannelSettings | Unset):
    """

    email: NotificationChannelSettings | Unset = UNSET
    slack: NotificationChannelSettings | Unset = UNSET
    teams: NotificationChannelSettings | Unset = UNSET
    web_push: NotificationChannelSettings | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        email: dict[str, Any] | Unset = UNSET
        if not isinstance(self.email, Unset):
            email = self.email.to_dict()

        slack: dict[str, Any] | Unset = UNSET
        if not isinstance(self.slack, Unset):
            slack = self.slack.to_dict()

        teams: dict[str, Any] | Unset = UNSET
        if not isinstance(self.teams, Unset):
            teams = self.teams.to_dict()

        web_push: dict[str, Any] | Unset = UNSET
        if not isinstance(self.web_push, Unset):
            web_push = self.web_push.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if email is not UNSET:
            field_dict["email"] = email
        if slack is not UNSET:
            field_dict["slack"] = slack
        if teams is not UNSET:
            field_dict["teams"] = teams
        if web_push is not UNSET:
            field_dict["webPush"] = web_push

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.notification_channel_settings import NotificationChannelSettings

        d = dict(src_dict)
        _email = d.pop("email", UNSET)
        email: NotificationChannelSettings | Unset
        if isinstance(_email, Unset):
            email = UNSET
        else:
            email = NotificationChannelSettings.from_dict(_email)

        _slack = d.pop("slack", UNSET)
        slack: NotificationChannelSettings | Unset
        if isinstance(_slack, Unset):
            slack = UNSET
        else:
            slack = NotificationChannelSettings.from_dict(_slack)

        _teams = d.pop("teams", UNSET)
        teams: NotificationChannelSettings | Unset
        if isinstance(_teams, Unset):
            teams = UNSET
        else:
            teams = NotificationChannelSettings.from_dict(_teams)

        _web_push = d.pop("webPush", UNSET)
        web_push: NotificationChannelSettings | Unset
        if isinstance(_web_push, Unset):
            web_push = UNSET
        else:
            web_push = NotificationChannelSettings.from_dict(_web_push)

        notification_settings = cls(
            email=email,
            slack=slack,
            teams=teams,
            web_push=web_push,
        )

        notification_settings.additional_properties = d
        return notification_settings

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
