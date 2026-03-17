from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class MarkInboxNotificationAsReadResponse200:
    """ """

    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        mark_inbox_notification_as_read_response_200 = cls()

        return mark_inbox_notification_as_read_response_200
