from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetRoomsRoomIdThreadsThreadIdParticipantsResponse200")


@_attrs_define
class GetRoomsRoomIdThreadsThreadIdParticipantsResponse200:
    """
    Attributes:
        participant_ids (list[str] | Unset):
    """

    participant_ids: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        participant_ids: list[str] | Unset = UNSET
        if not isinstance(self.participant_ids, Unset):
            participant_ids = self.participant_ids

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if participant_ids is not UNSET:
            field_dict["participantIds"] = participant_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        participant_ids = cast(list[str], d.pop("participantIds", UNSET))

        get_rooms_room_id_threads_thread_id_participants_response_200 = cls(
            participant_ids=participant_ids,
        )

        get_rooms_room_id_threads_thread_id_participants_response_200.additional_properties = d
        return get_rooms_room_id_threads_thread_id_participants_response_200

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
