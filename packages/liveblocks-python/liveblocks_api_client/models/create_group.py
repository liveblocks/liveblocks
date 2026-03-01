from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_group_scopes import CreateGroupScopes


T = TypeVar("T", bound="CreateGroup")


@_attrs_define
class CreateGroup:
    """
    Attributes:
        group_id (str):
        member_ids (list[str] | Unset):
        organization_id (str | Unset):
        scopes (CreateGroupScopes | Unset):
    """

    group_id: str
    member_ids: list[str] | Unset = UNSET
    organization_id: str | Unset = UNSET
    scopes: CreateGroupScopes | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        group_id = self.group_id

        member_ids: list[str] | Unset = UNSET
        if not isinstance(self.member_ids, Unset):
            member_ids = self.member_ids

        organization_id = self.organization_id

        scopes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.scopes, Unset):
            scopes = self.scopes.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "groupId": group_id,
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
        from ..models.create_group_scopes import CreateGroupScopes

        d = dict(src_dict)
        group_id = d.pop("groupId")

        member_ids = cast(list[str], d.pop("memberIds", UNSET))

        organization_id = d.pop("organizationId", UNSET)

        _scopes = d.pop("scopes", UNSET)
        scopes: CreateGroupScopes | Unset
        if isinstance(_scopes, Unset):
            scopes = UNSET
        else:
            scopes = CreateGroupScopes.from_dict(_scopes)

        create_group = cls(
            group_id=group_id,
            member_ids=member_ids,
            organization_id=organization_id,
            scopes=scopes,
        )

        create_group.additional_properties = d
        return create_group

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
