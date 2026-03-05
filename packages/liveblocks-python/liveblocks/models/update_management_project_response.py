from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.management_project import ManagementProject


T = TypeVar("T", bound="UpdateManagementProjectResponse")


@_attrs_define
class UpdateManagementProjectResponse:
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
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.management_project import ManagementProject

        d = dict(src_dict)
        project = ManagementProject.from_dict(d.pop("project"))

        update_management_project_response = cls(
            project=project,
        )

        return update_management_project_response
