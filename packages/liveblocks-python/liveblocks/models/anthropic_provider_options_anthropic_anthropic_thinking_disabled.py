from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, Self, cast

from attrs import define as _attrs_define


@_attrs_define
class AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled:
    """
    Attributes:
        type_ (Literal['disabled']):
    """

    type_: Literal["disabled"]

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "type": type_,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        type_ = cast(Literal["disabled"], d.pop("type"))
        if type_ != "disabled":
            raise ValueError(f"type must match const 'disabled', got '{type_}'")

        anthropic_provider_options_anthropic_anthropic_thinking_disabled = cls(
            type_=type_,
        )

        return anthropic_provider_options_anthropic_anthropic_thinking_disabled
