from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from dateutil.parser import isoparse

if TYPE_CHECKING:
    from ..models.inbox_notification_activity_data import InboxNotificationActivityData


@_attrs_define
class InboxNotificationActivity:
    """
    Example:
        {'id': 'act_abc123', 'createdAt': '2024-01-15T10:30:00.000Z', 'data': {'url': 'url-to-file'}}

    Attributes:
        id (str):
        created_at (datetime.datetime):
        data (InboxNotificationActivityData):
    """

    id: str
    created_at: datetime.datetime
    data: InboxNotificationActivityData

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        created_at = self.created_at.isoformat()

        data = self.data.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "createdAt": created_at,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.inbox_notification_activity_data import InboxNotificationActivityData

        d = dict(src_dict)
        id = d.pop("id")

        created_at = isoparse(d.pop("createdAt"))

        data = InboxNotificationActivityData.from_dict(d.pop("data"))

        inbox_notification_activity = cls(
            id=id,
            created_at=created_at,
            data=data,
        )

        return inbox_notification_activity
