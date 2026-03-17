from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset


@_attrs_define
class GetThreadInboxNotificationsResponseDataItem:
    """
    Attributes:
        id (str):
        kind (str):
        thread_id (str):
        room_id (str):
        read_at (datetime.datetime | None):
        notified_at (datetime.datetime):
        user_id (str): The user ID this notification belongs to.
        organization_id (str | Unset):
    """

    id: str
    kind: str
    thread_id: str
    room_id: str
    read_at: datetime.datetime | None
    notified_at: datetime.datetime
    user_id: str
    organization_id: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

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

        user_id = self.user_id

        organization_id = self.organization_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "kind": kind,
                "threadId": thread_id,
                "roomId": room_id,
                "readAt": read_at,
                "notifiedAt": notified_at,
                "userId": user_id,
            }
        )
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
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

        user_id = d.pop("userId")

        organization_id = d.pop("organizationId", UNSET)

        get_thread_inbox_notifications_response_data_item = cls(
            id=id,
            kind=kind,
            thread_id=thread_id,
            room_id=room_id,
            read_at=read_at,
            notified_at=notified_at,
            user_id=user_id,
            organization_id=organization_id,
        )

        get_thread_inbox_notifications_response_data_item.additional_properties = d
        return get_thread_inbox_notifications_response_data_item

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
