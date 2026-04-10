from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.feed_message_data import FeedMessageData


@_attrs_define
class FeedMessage:
    """Message objects returned by the API use `createdAt` and `updatedAt` (Unix time in milliseconds). Request bodies for
    create/update use `timestamp` for optional custom times.

        Attributes:
            id (str):
            created_at (float): Unix timestamp in milliseconds when the message was created.
            updated_at (float): Unix timestamp in milliseconds when the message was last updated.
            data (FeedMessageData):
    """

    id: str
    created_at: float
    updated_at: float
    data: FeedMessageData
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        created_at = self.created_at

        updated_at = self.updated_at

        data = self.data.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.feed_message_data import FeedMessageData

        d = dict(src_dict)
        id = d.pop("id")

        created_at = d.pop("createdAt")

        updated_at = d.pop("updatedAt")

        data = FeedMessageData.from_dict(d.pop("data"))

        feed_message = cls(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            data=data,
        )

        feed_message.additional_properties = d
        return feed_message

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
