from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.inbox_notification_activity import InboxNotificationActivity


@_attrs_define
class InboxNotificationCustomData:
    """
    Attributes:
        id (str):
        kind (Literal['custom']):
        subject_id (str):
        read_at (datetime.datetime | None):
        notified_at (datetime.datetime):
        activities (list[InboxNotificationActivity]):
        room_id (None | str | Unset):
    """

    id: str
    kind: Literal["custom"]
    subject_id: str
    read_at: datetime.datetime | None
    notified_at: datetime.datetime
    activities: list[InboxNotificationActivity]
    room_id: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        kind = self.kind

        subject_id = self.subject_id

        read_at: None | str
        if isinstance(self.read_at, datetime.datetime):
            read_at = self.read_at.isoformat()
        else:
            read_at = self.read_at

        notified_at = self.notified_at.isoformat()

        activities = []
        for activities_item_data in self.activities:
            activities_item = activities_item_data.to_dict()
            activities.append(activities_item)

        room_id: None | str | Unset
        if isinstance(self.room_id, Unset):
            room_id = UNSET
        else:
            room_id = self.room_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "kind": kind,
                "subjectId": subject_id,
                "readAt": read_at,
                "notifiedAt": notified_at,
                "activities": activities,
            }
        )
        if room_id is not UNSET:
            field_dict["roomId"] = room_id

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.inbox_notification_activity import InboxNotificationActivity

        d = dict(src_dict)
        id = d.pop("id")

        kind = cast(Literal["custom"], d.pop("kind"))
        if kind != "custom":
            raise ValueError(f"kind must match const 'custom', got '{kind}'")

        subject_id = d.pop("subjectId")

        def _parse_read_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                read_at_type_0 = isoparse(data)

                return read_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        read_at = _parse_read_at(d.pop("readAt"))

        notified_at = isoparse(d.pop("notifiedAt"))

        activities = []
        _activities = d.pop("activities")
        for activities_item_data in _activities:
            activities_item = InboxNotificationActivity.from_dict(activities_item_data)

            activities.append(activities_item)

        def _parse_room_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        room_id = _parse_room_id(d.pop("roomId", UNSET))

        inbox_notification_custom_data = cls(
            id=id,
            kind=kind,
            subject_id=subject_id,
            read_at=read_at,
            notified_at=notified_at,
            activities=activities,
            room_id=room_id,
        )

        return inbox_notification_custom_data
