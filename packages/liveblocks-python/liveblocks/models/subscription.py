from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define
from dateutil.parser import isoparse


@_attrs_define
class Subscription:
    """
    Example:
        {'kind': 'thread', 'subjectId': 'th_abc123', 'createdAt': '2022-07-13T14:32:50.697Z'}

    Attributes:
        kind (str):
        subject_id (str):
        created_at (datetime.datetime):
    """

    kind: str
    subject_id: str
    created_at: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        kind = self.kind

        subject_id = self.subject_id

        created_at = self.created_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "kind": kind,
                "subjectId": subject_id,
                "createdAt": created_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        kind = d.pop("kind")

        subject_id = d.pop("subjectId")

        created_at = isoparse(d.pop("createdAt"))

        subscription = cls(
            kind=kind,
            subject_id=subject_id,
            created_at=created_at,
        )

        return subscription
