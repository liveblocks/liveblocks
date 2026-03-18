from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.management_project import ManagementProject


@_attrs_define
class GetManagementProjectsResponse:
    """
    Example:
        {'data': [{'id': '683d49ed6b4d1cec5a597b13', 'teamId': 'team_123', 'type': 'dev', 'name': 'My Project',
            'createdAt': '2024-09-03T12:34:56.000Z', 'updatedAt': '2024-09-03T12:34:56.000Z', 'publicKey': {'activated':
            True, 'createdAt': '2024-09-03T12:34:56.000Z', 'value': 'pk_dev_123'}, 'secretKey': {'createdAt':
            '2024-09-03T12:34:56.000Z', 'value': 'sk_dev_123'}, 'region': 'earth', 'versionCreationTimeout': False}],
            'nextCursor': None}

    Attributes:
        next_cursor (None | str):
        data (list[ManagementProject] | Unset):
    """

    next_cursor: None | str
    data: list[ManagementProject] | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        next_cursor: None | str
        next_cursor = self.next_cursor

        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item = data_item_data.to_dict()
                data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "nextCursor": next_cursor,
            }
        )
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_project import ManagementProject

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        _data = d.pop("data", UNSET)
        data: list[ManagementProject] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:
                data_item = ManagementProject.from_dict(data_item_data)

                data.append(data_item)

        get_management_projects_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_management_projects_response
