from __future__ import annotations

import warnings
from collections.abc import Mapping
from typing import Any, Self, cast

from attrs import define as _attrs_define


@_attrs_define
class GetThreadParticipantsResponse:
    """
    Attributes:
        participant_ids (list[str]):
    """

    participant_ids: list[str]

    def __attrs_post_init__(self) -> None:
        warnings.warn(
            "GetThreadParticipantsResponse is deprecated",
            DeprecationWarning,
            stacklevel=2,
        )

    def to_dict(self) -> dict[str, Any]:
        participant_ids = self.participant_ids

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "participantIds": participant_ids,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        participant_ids = cast(list[str], d.pop("participantIds"))

        get_thread_participants_response = cls(
            participant_ids=participant_ids,
        )

        return get_thread_participants_response
