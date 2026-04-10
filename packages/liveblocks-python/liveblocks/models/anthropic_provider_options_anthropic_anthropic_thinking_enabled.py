from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, Self, cast

from attrs import define as _attrs_define


@_attrs_define
class AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled:
    """
    Attributes:
        type_ (Literal['enabled']):
        budget_tokens (int):
    """

    type_: Literal["enabled"]
    budget_tokens: int

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        budget_tokens = self.budget_tokens

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "type": type_,
                "budgetTokens": budget_tokens,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        type_ = cast(Literal["enabled"], d.pop("type"))
        if type_ != "enabled":
            raise ValueError(f"type must match const 'enabled', got '{type_}'")

        budget_tokens = d.pop("budgetTokens")

        anthropic_provider_options_anthropic_anthropic_thinking_enabled = cls(
            type_=type_,
            budget_tokens=budget_tokens,
        )

        return anthropic_provider_options_anthropic_anthropic_thinking_enabled
