from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="AiCopilotType1ProviderOptionsAnthropicThinkingType1")


@_attrs_define
class AiCopilotType1ProviderOptionsAnthropicThinkingType1:
    """
    Attributes:
        type_ (Literal['disabled']):
    """

    type_: Literal["disabled"]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        type_ = cast(Literal["disabled"], d.pop("type"))
        if type_ != "disabled":
            raise ValueError(f"type must match const 'disabled', got '{type_}'")

        ai_copilot_type_1_provider_options_anthropic_thinking_type_1 = cls(
            type_=type_,
        )

        ai_copilot_type_1_provider_options_anthropic_thinking_type_1.additional_properties = d
        return ai_copilot_type_1_provider_options_anthropic_thinking_type_1

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
