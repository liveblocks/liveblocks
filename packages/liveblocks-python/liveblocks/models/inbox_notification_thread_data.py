from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse

T = TypeVar("T", bound="InboxNotificationThreadData")


@_attrs_define
class InboxNotificationThreadData:
    """
    Attributes:
        id (str):
        kind (str):
        thread_id (str):
        room_id (str):
        read_at (datetime.datetime | None):
        notified_at (datetime.datetime):
    """

    id: str
    kind: str
    thread_id: str
    room_id: str
    read_at: datetime.datetime | None
    notified_at: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        kind = self.kind

        thread_id = self.thread_id

        room_id = self.room_id

        read_at: None | str
        if isinstance(self.read_at, datetime.datetime):
            read_at = self.read_at.isoformat()
        else:
            read_at = self.read_at

        notified_at = self.notified_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "kind": kind,
                "threadId": thread_id,
                "roomId": room_id,
                "readAt": read_at,
                "notifiedAt": notified_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        kind = d.pop("kind")

        thread_id = d.pop("threadId")

        room_id = d.pop("roomId")

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

        inbox_notification_thread_data = cls(
            id=id,
            kind=kind,
            thread_id=thread_id,
            room_id=room_id,
            read_at=read_at,
            notified_at=notified_at,
        )

        return inbox_notification_thread_data
