from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_users_user_id_subscription_settings_response_200_meta import (
        GetUsersUserIdSubscriptionSettingsResponse200Meta,
    )
    from ..models.user_room_subscription_settings import UserRoomSubscriptionSettings


T = TypeVar("T", bound="GetUsersUserIdSubscriptionSettingsResponse200")


@_attrs_define
class GetUsersUserIdSubscriptionSettingsResponse200:
    """
    Attributes:
        data (list[UserRoomSubscriptionSettings] | Unset):
        meta (GetUsersUserIdSubscriptionSettingsResponse200Meta | Unset):
    """

    data: list[UserRoomSubscriptionSettings] | Unset = UNSET
    meta: GetUsersUserIdSubscriptionSettingsResponse200Meta | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item = data_item_data.to_dict()
                data.append(data_item)

        meta: dict[str, Any] | Unset = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if data is not UNSET:
            field_dict["data"] = data
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_users_user_id_subscription_settings_response_200_meta import (
            GetUsersUserIdSubscriptionSettingsResponse200Meta,
        )
        from ..models.user_room_subscription_settings import UserRoomSubscriptionSettings

        d = dict(src_dict)
        _data = d.pop("data", UNSET)
        data: list[UserRoomSubscriptionSettings] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:
                data_item = UserRoomSubscriptionSettings.from_dict(data_item_data)

                data.append(data_item)

        _meta = d.pop("meta", UNSET)
        meta: GetUsersUserIdSubscriptionSettingsResponse200Meta | Unset
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = GetUsersUserIdSubscriptionSettingsResponse200Meta.from_dict(_meta)

        get_users_user_id_subscription_settings_response_200 = cls(
            data=data,
            meta=meta,
        )

        get_users_user_id_subscription_settings_response_200.additional_properties = d
        return get_users_user_id_subscription_settings_response_200

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
