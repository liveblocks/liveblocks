from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="TestManagementWebhookResponseMessage")


@_attrs_define
class TestManagementWebhookResponseMessage:
    """
    Attributes:
        id (str):
        delivered_at (datetime.datetime | None | Unset):
    """

    id: str
    delivered_at: datetime.datetime | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        delivered_at: None | str | Unset
        if isinstance(self.delivered_at, Unset):
            delivered_at = UNSET
        elif isinstance(self.delivered_at, datetime.datetime):
            delivered_at = self.delivered_at.isoformat()
        else:
            delivered_at = self.delivered_at

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
            }
        )
        if delivered_at is not UNSET:
            field_dict["deliveredAt"] = delivered_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        def _parse_delivered_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                delivered_at_type_0 = isoparse(data)

                return delivered_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        delivered_at = _parse_delivered_at(d.pop("deliveredAt", UNSET))

        test_management_webhook_response_message = cls(
            id=id,
            delivered_at=delivered_at,
        )

        return test_management_webhook_response_message
