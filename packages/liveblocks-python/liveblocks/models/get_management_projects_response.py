from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_project import ManagementProject


@_attrs_define
class GetManagementProjectsResponse:
    """
    Attributes:
        projects (list[ManagementProject]):
        next_cursor (None | str):
    """

    projects: list[ManagementProject]
    next_cursor: None | str

    def to_dict(self) -> dict[str, Any]:
        projects = []
        for projects_item_data in self.projects:
            projects_item = projects_item_data.to_dict()
            projects.append(projects_item)

        next_cursor: None | str
        next_cursor = self.next_cursor

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "projects": projects,
                "nextCursor": next_cursor,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_project import ManagementProject

        d = dict(src_dict)
        projects = []
        _projects = d.pop("projects")
        for projects_item_data in _projects:
            projects_item = ManagementProject.from_dict(projects_item_data)

            projects.append(projects_item)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        get_management_projects_response = cls(
            projects=projects,
            next_cursor=next_cursor,
        )

        return get_management_projects_response
