from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self

from attrs import define as _attrs_define


@_attrs_define
class UpdateRoomOrganizationIdRequestBody:
    """
    Example:
        {'fromOrganizationId': 'org_123456789', 'toOrganizationId': 'org_987654321'}

    Attributes:
        from_organization_id (str): The current organization ID of the room. Must match the room's current organization
            ID.
        to_organization_id (str): The new organization ID to assign to the room.
    """

    from_organization_id: str
    to_organization_id: str

    def to_dict(self) -> dict[str, Any]:
        from_organization_id = self.from_organization_id

        to_organization_id = self.to_organization_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "fromOrganizationId": from_organization_id,
                "toOrganizationId": to_organization_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        from_organization_id = d.pop("fromOrganizationId")

        to_organization_id = d.pop("toOrganizationId")

        update_room_organization_id_request_body = cls(
            from_organization_id=from_organization_id,
            to_organization_id=to_organization_id,
        )

        return update_room_organization_id_request_body
