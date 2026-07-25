from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.live_file_data import LiveFileData


@_attrs_define
class LiveFile:
    """Plain LSON representation of an immutable LiveFile node.

    Example:
        {'liveblocksType': 'LiveFile', 'data': {'id': 'fl_abc123456789012345678', 'name': 'photo.png', 'size': 12345,
            'mimeType': 'image/png'}}

    Attributes:
        liveblocks_type (Literal['LiveFile']):
        data (LiveFileData): Immutable reference to a file from Storage stored inside a LiveFile node.
    """

    liveblocks_type: Literal["LiveFile"]
    data: LiveFileData

    def to_dict(self) -> dict[str, Any]:
        liveblocks_type = self.liveblocks_type

        data = self.data.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "liveblocksType": liveblocks_type,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.live_file_data import LiveFileData

        d = dict(src_dict)
        liveblocks_type = cast(Literal["LiveFile"], d.pop("liveblocksType"))
        if liveblocks_type != "LiveFile":
            raise ValueError(f"liveblocksType must match const 'LiveFile', got '{liveblocks_type}'")

        data = LiveFileData.from_dict(d.pop("data"))

        live_file = cls(
            liveblocks_type=liveblocks_type,
            data=data,
        )

        return live_file
