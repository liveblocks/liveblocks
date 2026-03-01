from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.inbox_notification_custom_data_activity_data import InboxNotificationCustomDataActivityData


T = TypeVar("T", bound="InboxNotificationCustomData")


@_attrs_define
class InboxNotificationCustomData:
    """
    Attributes:
        id (str | Unset):
        kind (str | Unset):
        subject_id (str | Unset):
        room_id (str | Unset):
        read_at (datetime.datetime | Unset):
        notified_at (datetime.datetime | Unset):
        activity_data (InboxNotificationCustomDataActivityData | Unset):
    """

    id: str | Unset = UNSET
    kind: str | Unset = UNSET
    subject_id: str | Unset = UNSET
    room_id: str | Unset = UNSET
    read_at: datetime.datetime | Unset = UNSET
    notified_at: datetime.datetime | Unset = UNSET
    activity_data: InboxNotificationCustomDataActivityData | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        kind = self.kind

        subject_id = self.subject_id

        room_id = self.room_id

        read_at: str | Unset = UNSET
        if not isinstance(self.read_at, Unset):
            read_at = self.read_at.isoformat()

        notified_at: str | Unset = UNSET
        if not isinstance(self.notified_at, Unset):
            notified_at = self.notified_at.isoformat()

        activity_data: dict[str, Any] | Unset = UNSET
        if not isinstance(self.activity_data, Unset):
            activity_data = self.activity_data.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if kind is not UNSET:
            field_dict["kind"] = kind
        if subject_id is not UNSET:
            field_dict["subjectId"] = subject_id
        if room_id is not UNSET:
            field_dict["roomId"] = room_id
        if read_at is not UNSET:
            field_dict["readAt"] = read_at
        if notified_at is not UNSET:
            field_dict["notifiedAt"] = notified_at
        if activity_data is not UNSET:
            field_dict["activityData"] = activity_data

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.inbox_notification_custom_data_activity_data import InboxNotificationCustomDataActivityData

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        kind = d.pop("kind", UNSET)

        subject_id = d.pop("subjectId", UNSET)

        room_id = d.pop("roomId", UNSET)

        _read_at = d.pop("readAt", UNSET)
        read_at: datetime.datetime | Unset
        if isinstance(_read_at, Unset):
            read_at = UNSET
        else:
            read_at = isoparse(_read_at)

        _notified_at = d.pop("notifiedAt", UNSET)
        notified_at: datetime.datetime | Unset
        if isinstance(_notified_at, Unset):
            notified_at = UNSET
        else:
            notified_at = isoparse(_notified_at)

        _activity_data = d.pop("activityData", UNSET)
        activity_data: InboxNotificationCustomDataActivityData | Unset
        if isinstance(_activity_data, Unset):
            activity_data = UNSET
        else:
            activity_data = InboxNotificationCustomDataActivityData.from_dict(_activity_data)

        inbox_notification_custom_data = cls(
            id=id,
            kind=kind,
            subject_id=subject_id,
            room_id=room_id,
            read_at=read_at,
            notified_at=notified_at,
            activity_data=activity_data,
        )

        inbox_notification_custom_data.additional_properties = d
        return inbox_notification_custom_data

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
