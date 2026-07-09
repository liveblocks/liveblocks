from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.create_version_history_snapshot_response_data import CreateVersionHistorySnapshotResponseData


@_attrs_define
class CreateVersionHistorySnapshotResponse:
    """
    Example:
        {'data': {'id': 'vh_abc123'}}

    Attributes:
        data (CreateVersionHistorySnapshotResponseData):
    """

    data: CreateVersionHistorySnapshotResponseData

    def to_dict(self) -> dict[str, Any]:
        data = self.data.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.create_version_history_snapshot_response_data import CreateVersionHistorySnapshotResponseData

        d = dict(src_dict)
        data = CreateVersionHistorySnapshotResponseData.from_dict(d.pop("data"))

        create_version_history_snapshot_response = cls(
            data=data,
        )

        return create_version_history_snapshot_response
