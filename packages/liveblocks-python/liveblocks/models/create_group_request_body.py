from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_group_request_body_scopes import CreateGroupRequestBodyScopes


T = TypeVar("T", bound="CreateGroupRequestBody")


@_attrs_define
class CreateGroupRequestBody:
    """
    Attributes:
        id (str):
        member_ids (list[str] | Unset):
        organization_id (str | Unset):
        scopes (CreateGroupRequestBodyScopes | Unset):
    """

    id: str
    member_ids: list[str] | Unset = UNSET
    organization_id: str | Unset = UNSET
    scopes: CreateGroupRequestBodyScopes | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        member_ids: list[str] | Unset = UNSET
        if not isinstance(self.member_ids, Unset):
            member_ids = self.member_ids

        organization_id = self.organization_id

        scopes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.scopes, Unset):
            scopes = self.scopes.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
            }
        )
        if member_ids is not UNSET:
            field_dict["memberIds"] = member_ids
        if organization_id is not UNSET:
            field_dict["organizationId"] = organization_id
        if scopes is not UNSET:
            field_dict["scopes"] = scopes

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_group_request_body_scopes import CreateGroupRequestBodyScopes

        d = dict(src_dict)
        id = d.pop("id")

        member_ids = cast(list[str], d.pop("memberIds", UNSET))

        organization_id = d.pop("organizationId", UNSET)

        _scopes = d.pop("scopes", UNSET)
        scopes: CreateGroupRequestBodyScopes | Unset
        if isinstance(_scopes, Unset):
            scopes = UNSET
        else:
            scopes = CreateGroupRequestBodyScopes.from_dict(_scopes)

        create_group_request_body = cls(
            id=id,
            member_ids=member_ids,
            organization_id=organization_id,
            scopes=scopes,
        )

        return create_group_request_body
