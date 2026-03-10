from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.authorize_user_request_body_permissions import AuthorizeUserRequestBodyPermissions
    from ..models.authorize_user_request_body_user_info import AuthorizeUserRequestBodyUserInfo


@_attrs_define
class AuthorizeUserRequestBody:
    """
    Attributes:
        user_id (str):
        permissions (AuthorizeUserRequestBodyPermissions):
        user_info (AuthorizeUserRequestBodyUserInfo | Unset):
        organization_id (str | Unset):
    """

    user_id: str
    permissions: AuthorizeUserRequestBodyPermissions
    user_info: AuthorizeUserRequestBodyUserInfo | Unset = UNSET
    organization_id: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        permissions = self.permissions.to_dict()

        user_info: dict[str, Any] | Unset = UNSET
        if not isinstance(self.user_info, Unset):
            user_info = self.user_info.to_dict()

        organization_id = self.organization_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "userId": user_id,
                "permissions": permissions,
            }
        )
        if user_info is not UNSET:
            field_dict["userInfo"] = user_info
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.authorize_user_request_body_permissions import AuthorizeUserRequestBodyPermissions
        from ..models.authorize_user_request_body_user_info import AuthorizeUserRequestBodyUserInfo

        d = dict(src_dict)
        user_id = d.pop("userId")

        permissions = AuthorizeUserRequestBodyPermissions.from_dict(d.pop("permissions"))

        _user_info = d.pop("userInfo", UNSET)
        user_info: AuthorizeUserRequestBodyUserInfo | Unset
        if isinstance(_user_info, Unset):
            user_info = UNSET
        else:
            user_info = AuthorizeUserRequestBodyUserInfo.from_dict(_user_info)

        organization_id = d.pop("organizationId", UNSET)

        authorize_user_request_body = cls(
            user_id=user_id,
            permissions=permissions,
            user_info=user_info,
            organization_id=organization_id,
        )

        return authorize_user_request_body
