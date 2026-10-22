from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class RecoverFailedWebhookMessagesResponse200:
    """
    Attributes:
        ok (bool):
    """

    ok: bool

    def to_dict(self) -> dict[str, Any]:
        ok = self.ok

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "ok": ok,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        ok = d.pop("ok")

        recover_failed_webhook_messages_response_200 = cls(
            ok=ok,
        )

        return recover_failed_webhook_messages_response_200
