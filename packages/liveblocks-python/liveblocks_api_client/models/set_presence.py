from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.set_presence_data import SetPresenceData
    from ..models.set_presence_user_info import SetPresenceUserInfo


T = TypeVar("T", bound="SetPresence")


@_attrs_define
class SetPresence:
    """
    Attributes:
        user_id (str): ID of the user to set presence for
        data (SetPresenceData): Presence data as a JSON object
        user_info (SetPresenceUserInfo | Unset): Metadata about the user or agent
        ttl (int | Unset): Time-to-live in seconds (minimum: 2, maximum: 3599). After this duration, the presence will
            automatically expire.
    """

    user_id: str
    data: SetPresenceData
    user_info: SetPresenceUserInfo | Unset = UNSET
    ttl: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        data = self.data.to_dict()

        user_info: dict[str, Any] | Unset = UNSET
        if not isinstance(self.user_info, Unset):
            user_info = self.user_info.to_dict()

        ttl = self.ttl

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "userId": user_id,
                "data": data,
            }
        )
        if user_info is not UNSET:
            field_dict["userInfo"] = user_info
        if ttl is not UNSET:
            field_dict["ttl"] = ttl

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.set_presence_data import SetPresenceData
        from ..models.set_presence_user_info import SetPresenceUserInfo

        d = dict(src_dict)
        user_id = d.pop("userId")

        data = SetPresenceData.from_dict(d.pop("data"))

        _user_info = d.pop("userInfo", UNSET)
        user_info: SetPresenceUserInfo | Unset
        if isinstance(_user_info, Unset):
            user_info = UNSET
        else:
            user_info = SetPresenceUserInfo.from_dict(_user_info)

        ttl = d.pop("ttl", UNSET)

        set_presence = cls(
            user_id=user_id,
            data=data,
            user_info=user_info,
            ttl=ttl,
        )

        set_presence.additional_properties = d
        return set_presence

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
