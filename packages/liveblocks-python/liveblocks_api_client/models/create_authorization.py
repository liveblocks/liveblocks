from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_authorization_user_info import CreateAuthorizationUserInfo


T = TypeVar("T", bound="CreateAuthorization")


@_attrs_define
class CreateAuthorization:
    """
    Attributes:
        user_id (str | Unset):
        user_info (CreateAuthorizationUserInfo | Unset):
        group_ids (list[str] | Unset):
    """

    user_id: str | Unset = UNSET
    user_info: CreateAuthorizationUserInfo | Unset = UNSET
    group_ids: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        user_info: dict[str, Any] | Unset = UNSET
        if not isinstance(self.user_info, Unset):
            user_info = self.user_info.to_dict()

        group_ids: list[str] | Unset = UNSET
        if not isinstance(self.group_ids, Unset):
            group_ids = self.group_ids

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if user_id is not UNSET:
            field_dict["userId"] = user_id
        if user_info is not UNSET:
            field_dict["userInfo"] = user_info
        if group_ids is not UNSET:
            field_dict["groupIds"] = group_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_authorization_user_info import CreateAuthorizationUserInfo

        d = dict(src_dict)
        user_id = d.pop("userId", UNSET)

        _user_info = d.pop("userInfo", UNSET)
        user_info: CreateAuthorizationUserInfo | Unset
        if isinstance(_user_info, Unset):
            user_info = UNSET
        else:
            user_info = CreateAuthorizationUserInfo.from_dict(_user_info)

        group_ids = cast(list[str], d.pop("groupIds", UNSET))

        create_authorization = cls(
            user_id=user_id,
            user_info=user_info,
            group_ids=group_ids,
        )

        create_authorization.additional_properties = d
        return create_authorization

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
