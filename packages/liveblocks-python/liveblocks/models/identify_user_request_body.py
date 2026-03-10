from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.identify_user_request_body_user_info import IdentifyUserRequestBodyUserInfo


@_attrs_define
class IdentifyUserRequestBody:
    """
    Attributes:
        user_id (str):
        organization_id (str | Unset):
        group_ids (list[str] | Unset):
        user_info (IdentifyUserRequestBodyUserInfo | Unset):
    """

    user_id: str
    organization_id: str | Unset = UNSET
    group_ids: list[str] | Unset = UNSET
    user_info: IdentifyUserRequestBodyUserInfo | Unset = UNSET

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

        field_dict.update(
            {
                "userId": user_id,
            }
        )
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id
        if group_ids is not UNSET:
            field_dict["groupIds"] = group_ids
        if user_info is not UNSET:
            field_dict["userInfo"] = user_info

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.identify_user_request_body_user_info import IdentifyUserRequestBodyUserInfo

        d = dict(src_dict)
        user_id = d.pop("userId")

        organization_id = d.pop("organizationId", UNSET)

        group_ids = cast(list[str], d.pop("groupIds", UNSET))

        _user_info = d.pop("userInfo", UNSET)
        user_info: IdentifyUserRequestBodyUserInfo | Unset
        if isinstance(_user_info, Unset):
            user_info = UNSET
        else:
            user_info = IdentifyUserRequestBodyUserInfo.from_dict(_user_info)

        identify_user_request_body = cls(
            user_id=user_id,
            organization_id=organization_id,
            group_ids=group_ids,
            user_info=user_info,
        )

        return identify_user_request_body
