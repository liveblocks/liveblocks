from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

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

        return notification_settings
