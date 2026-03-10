from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.active_users_response_data_item_info import ActiveUsersResponseDataItemInfo


@_attrs_define
class ActiveUsersResponseDataItem:
    """
    Attributes:
        type_ (Literal['user']):
        id (None | str):
        info (ActiveUsersResponseDataItemInfo):
        connection_id (int):
    """

    type_: Literal["user"]
    id: None | str
    info: ActiveUsersResponseDataItemInfo
    connection_id: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        id: None | str
        id = self.id

        info = self.info.to_dict()

        connection_id = self.connection_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "id": id,
                "info": info,
                "connectionId": connection_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.active_users_response_data_item_info import ActiveUsersResponseDataItemInfo

        d = dict(src_dict)
        type_ = cast(Literal["user"], d.pop("type"))
        if type_ != "user":
            raise ValueError(f"type must match const 'user', got '{type_}'")

        def _parse_id(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        id = _parse_id(d.pop("id"))

        info = ActiveUsersResponseDataItemInfo.from_dict(d.pop("info"))

        connection_id = d.pop("connectionId")

        active_users_response_data_item = cls(
            type_=type_,
            id=id,
            info=info,
            connection_id=connection_id,
        )

        active_users_response_data_item.additional_properties = d
        return active_users_response_data_item

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
