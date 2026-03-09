from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.trigger_inbox_notification_request_body_activity_data import (
        TriggerInboxNotificationRequestBodyActivityData,
    )


T = TypeVar("T", bound="TriggerInboxNotificationRequestBody")


@_attrs_define
class TriggerInboxNotificationRequestBody:
    """
    Attributes:
        user_id (str):
        kind (str):
        subject_id (str):
        activity_data (TriggerInboxNotificationRequestBodyActivityData):
        room_id (str | Unset):
        organization_id (str | Unset):
    """

    user_id: str
    kind: str
    subject_id: str
    activity_data: TriggerInboxNotificationRequestBodyActivityData
    room_id: str | Unset = UNSET
    organization_id: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        kind = self.kind

        subject_id = self.subject_id

        activity_data = self.activity_data.to_dict()

        room_id = self.room_id

        organization_id = self.organization_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "userId": user_id,
                "kind": kind,
                "subjectId": subject_id,
                "activityData": activity_data,
            }
        )
        if room_id is not UNSET:
            field_dict["roomId"] = room_id
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.trigger_inbox_notification_request_body_activity_data import (
            TriggerInboxNotificationRequestBodyActivityData,
        )

        d = dict(src_dict)
        user_id = d.pop("userId")

        kind = d.pop("kind")

        subject_id = d.pop("subjectId")

        activity_data = TriggerInboxNotificationRequestBodyActivityData.from_dict(d.pop("activityData"))

        room_id = d.pop("roomId", UNSET)

        organization_id = d.pop("organizationId", UNSET)

        trigger_inbox_notification_request_body = cls(
            user_id=user_id,
            kind=kind,
            subject_id=subject_id,
            activity_data=activity_data,
            room_id=room_id,
            organization_id=organization_id,
        )

        trigger_inbox_notification_request_body.additional_properties = d
        return trigger_inbox_notification_request_body

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
