from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="UpdateAiCopilotProviderOptionsType1AnthropicThinkingType0")


@_attrs_define
class UpdateAiCopilotProviderOptionsType1AnthropicThinkingType0:
    """
    Attributes:
        type_ (Literal['enabled']):
        budget_tokens (float):
    """

    type_: Literal["enabled"]
    budget_tokens: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        budget_tokens = self.budget_tokens

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "budgetTokens": budget_tokens,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        type_ = cast(Literal["enabled"], d.pop("type"))
        if type_ != "enabled":
            raise ValueError(f"type must match const 'enabled', got '{type_}'")

        budget_tokens = d.pop("budgetTokens")

        update_ai_copilot_provider_options_type_1_anthropic_thinking_type_0 = cls(
            type_=type_,
            budget_tokens=budget_tokens,
        )

        update_ai_copilot_provider_options_type_1_anthropic_thinking_type_0.additional_properties = d
        return update_ai_copilot_provider_options_type_1_anthropic_thinking_type_0

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
