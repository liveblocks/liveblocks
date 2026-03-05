from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from dateutil.parser import isoparse

T = TypeVar("T", bound="RecoverManagementWebhookFailedMessagesRequestBody")


@_attrs_define
class RecoverManagementWebhookFailedMessagesRequestBody:
    """
    Attributes:
        since (datetime.datetime):
    """

    since: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        since = self.since.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "since": since,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        since = isoparse(d.pop("since"))

        recover_management_webhook_failed_messages_request_body = cls(
            since=since,
        )

        return recover_management_webhook_failed_messages_request_body
