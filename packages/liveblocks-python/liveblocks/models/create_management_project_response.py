from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_project import ManagementProject


@_attrs_define
class CreateManagementProjectResponse:
    """
    Attributes:
        project (ManagementProject):
    """

    project: ManagementProject

    def to_dict(self) -> dict[str, Any]:
        project = self.project.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "project": project,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.management_project import ManagementProject

        d = dict(src_dict)
        project = ManagementProject.from_dict(d.pop("project"))

        create_management_project_response = cls(
            project=project,
        )

        return create_management_project_response
