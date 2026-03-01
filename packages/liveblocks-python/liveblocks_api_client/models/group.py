from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.group_type import GroupType

if TYPE_CHECKING:
    from ..models.group_member import GroupMember
    from ..models.group_scopes import GroupScopes


T = TypeVar("T", bound="Group")


@_attrs_define
class Group:
    """
    Attributes:
        type_ (GroupType):
        id (str):
        organization_id (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        scopes (GroupScopes):
        members (list[GroupMember]):
    """

    type_: GroupType
    id: str
    organization_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    scopes: GroupScopes
    members: list[GroupMember]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        id = self.id

        organization_id = self.organization_id

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        scopes = self.scopes.to_dict()

        members = []
        for members_item_data in self.members:
            members_item = members_item_data.to_dict()
            members.append(members_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "id": id,
                "organizationId": organization_id,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "scopes": scopes,
                "members": members,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.group_member import GroupMember
        from ..models.group_scopes import GroupScopes

        d = dict(src_dict)
        type_ = GroupType(d.pop("type"))

        id = d.pop("id")

        organization_id = d.pop("organizationId")

        created_at = isoparse(d.pop("createdAt"))

        updated_at = isoparse(d.pop("updatedAt"))

        scopes = GroupScopes.from_dict(d.pop("scopes"))

        members = []
        _members = d.pop("members")
        for members_item_data in _members:
            members_item = GroupMember.from_dict(members_item_data)

            members.append(members_item)

        group = cls(
            type_=type_,
            id=id,
            organization_id=organization_id,
            created_at=created_at,
            updated_at=updated_at,
            scopes=scopes,
            members=members,
        )

        group.additional_properties = d
        return group

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
