from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_type_0 import AiCopilotType0
    from ..models.ai_copilot_type_1 import AiCopilotType1
    from ..models.ai_copilot_type_2 import AiCopilotType2
    from ..models.ai_copilot_type_3 import AiCopilotType3


T = TypeVar("T", bound="GetAiCopilots")


@_attrs_define
class GetAiCopilots:
    """
    Attributes:
        next_cursor (str | Unset):
        data (list[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3] | Unset):
    """

    next_cursor: str | Unset = UNSET
    data: list[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.ai_copilot_type_0 import AiCopilotType0
        from ..models.ai_copilot_type_1 import AiCopilotType1
        from ..models.ai_copilot_type_2 import AiCopilotType2

        next_cursor = self.next_cursor

        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item: dict[str, Any]
                if isinstance(data_item_data, AiCopilotType0):
                    data_item = data_item_data.to_dict()
                elif isinstance(data_item_data, AiCopilotType1):
                    data_item = data_item_data.to_dict()
                elif isinstance(data_item_data, AiCopilotType2):
                    data_item = data_item_data.to_dict()
                else:
                    data_item = data_item_data.to_dict()

                data.append(data_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if next_cursor is not UNSET:
            field_dict["nextCursor"] = next_cursor
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ai_copilot_type_0 import AiCopilotType0
        from ..models.ai_copilot_type_1 import AiCopilotType1
        from ..models.ai_copilot_type_2 import AiCopilotType2
        from ..models.ai_copilot_type_3 import AiCopilotType3

        d = dict(src_dict)
        next_cursor = d.pop("nextCursor", UNSET)

        _data = d.pop("data", UNSET)
        data: list[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:

                def _parse_data_item(data: object) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
                    try:
                        if not isinstance(data, dict):
                            raise TypeError()
                        componentsschemas_ai_copilot_type_0 = AiCopilotType0.from_dict(data)

                        return componentsschemas_ai_copilot_type_0
                    except (TypeError, ValueError, AttributeError, KeyError):
                        pass
                    try:
                        if not isinstance(data, dict):
                            raise TypeError()
                        componentsschemas_ai_copilot_type_1 = AiCopilotType1.from_dict(data)

                        return componentsschemas_ai_copilot_type_1
                    except (TypeError, ValueError, AttributeError, KeyError):
                        pass
                    try:
                        if not isinstance(data, dict):
                            raise TypeError()
                        componentsschemas_ai_copilot_type_2 = AiCopilotType2.from_dict(data)

                        return componentsschemas_ai_copilot_type_2
                    except (TypeError, ValueError, AttributeError, KeyError):
                        pass
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_ai_copilot_type_3 = AiCopilotType3.from_dict(data)

                    return componentsschemas_ai_copilot_type_3

                data_item = _parse_data_item(data_item_data)

                data.append(data_item)

        get_ai_copilots = cls(
            next_cursor=next_cursor,
            data=data,
        )

        get_ai_copilots.additional_properties = d
        return get_ai_copilots

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
