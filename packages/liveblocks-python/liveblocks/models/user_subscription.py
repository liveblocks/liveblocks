from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset


@_attrs_define
class UserSubscription:
    """
    Attributes:
        kind (str):
        subject_id (str):
        created_at (datetime.datetime):
        user_id (str | Unset):
    """

    kind: str
    subject_id: str
    created_at: datetime.datetime
    user_id: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        kind = self.kind

        subject_id = self.subject_id

        created_at = self.created_at.isoformat()

        user_id = self.user_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "kind": kind,
                "subjectId": subject_id,
                "createdAt": created_at,
            }
        )
        if user_id is not UNSET:
            field_dict["userId"] = user_id

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        kind = d.pop("kind")

        subject_id = d.pop("subjectId")

        created_at = isoparse(d.pop("createdAt"))

        user_id = d.pop("userId", UNSET)

        user_subscription = cls(
            kind=kind,
            subject_id=subject_id,
            created_at=created_at,
            user_id=user_id,
        )

        user_subscription.additional_properties = d
        return user_subscription

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
