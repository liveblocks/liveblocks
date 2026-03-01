from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.authorize_user_request_permissions import AuthorizeUserRequestPermissions
    from ..models.authorize_user_request_user_info import AuthorizeUserRequestUserInfo


T = TypeVar("T", bound="AuthorizeUserRequest")


@_attrs_define
class AuthorizeUserRequest:
    """
    Attributes:
        user_id (str | Unset):
        user_info (AuthorizeUserRequestUserInfo | Unset):
        organization_id (str | Unset):
        permissions (AuthorizeUserRequestPermissions | Unset):
    """

    user_id: str | Unset = UNSET
    user_info: AuthorizeUserRequestUserInfo | Unset = UNSET
    organization_id: str | Unset = UNSET
    permissions: AuthorizeUserRequestPermissions | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        user_info: dict[str, Any] | Unset = UNSET
        if not isinstance(self.user_info, Unset):
            user_info = self.user_info.to_dict()

        organization_id = self.organization_id

        permissions: dict[str, Any] | Unset = UNSET
        if not isinstance(self.permissions, Unset):
            permissions = self.permissions.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if user_id is not UNSET:
            field_dict["userId"] = user_id
        if user_info is not UNSET:
            field_dict["userInfo"] = user_info
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id
        if permissions is not UNSET:
            field_dict["permissions"] = permissions

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.authorize_user_request_permissions import AuthorizeUserRequestPermissions
        from ..models.authorize_user_request_user_info import AuthorizeUserRequestUserInfo

        d = dict(src_dict)
        user_id = d.pop("userId", UNSET)

        _user_info = d.pop("userInfo", UNSET)
        user_info: AuthorizeUserRequestUserInfo | Unset
        if isinstance(_user_info, Unset):
            user_info = UNSET
        else:
            user_info = AuthorizeUserRequestUserInfo.from_dict(_user_info)

        organization_id = d.pop("organizationId", UNSET)

        _permissions = d.pop("permissions", UNSET)
        permissions: AuthorizeUserRequestPermissions | Unset
        if isinstance(_permissions, Unset):
            permissions = UNSET
        else:
            permissions = AuthorizeUserRequestPermissions.from_dict(_permissions)

        authorize_user_request = cls(
            user_id=user_id,
            user_info=user_info,
            organization_id=organization_id,
            permissions=permissions,
        )

        authorize_user_request.additional_properties = d
        return authorize_user_request

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
