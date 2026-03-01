from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.identify_user_request_user_info import IdentifyUserRequestUserInfo


T = TypeVar("T", bound="IdentifyUserRequest")


@_attrs_define
class IdentifyUserRequest:
    """
    Attributes:
        user_id (str | Unset):
        organization_id (str | Unset):
        group_ids (list[str] | Unset):
        user_info (IdentifyUserRequestUserInfo | Unset):
    """

    user_id: str | Unset = UNSET
    organization_id: str | Unset = UNSET
    group_ids: list[str] | Unset = UNSET
    user_info: IdentifyUserRequestUserInfo | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        organization_id = self.organization_id

        group_ids: list[str] | Unset = UNSET
        if not isinstance(self.group_ids, Unset):
            group_ids = self.group_ids

        user_info: dict[str, Any] | Unset = UNSET
        if not isinstance(self.user_info, Unset):
            user_info = self.user_info.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if user_id is not UNSET:
            field_dict["userId"] = user_id
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id
        if group_ids is not UNSET:
            field_dict["groupIds"] = group_ids
        if user_info is not UNSET:
            field_dict["userInfo"] = user_info

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.identify_user_request_user_info import IdentifyUserRequestUserInfo

        d = dict(src_dict)
        user_id = d.pop("userId", UNSET)

        organization_id = d.pop("organizationId", UNSET)

        group_ids = cast(list[str], d.pop("groupIds", UNSET))

        _user_info = d.pop("userInfo", UNSET)
        user_info: IdentifyUserRequestUserInfo | Unset
        if isinstance(_user_info, Unset):
            user_info = UNSET
        else:
            user_info = IdentifyUserRequestUserInfo.from_dict(_user_info)

        identify_user_request = cls(
            user_id=user_id,
            organization_id=organization_id,
            group_ids=group_ids,
            user_info=user_info,
        )

        identify_user_request.additional_properties = d
        return identify_user_request

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
