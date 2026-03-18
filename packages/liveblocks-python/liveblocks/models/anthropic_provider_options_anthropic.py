from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.anthropic_provider_options_anthropic_anthropic_thinking_disabled import (
        AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled,
    )
    from ..models.anthropic_provider_options_anthropic_anthropic_thinking_enabled import (
        AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled,
    )
    from ..models.anthropic_provider_options_anthropic_anthropic_web_search import (
        AnthropicProviderOptionsAnthropicAnthropicWebSearch,
    )


@_attrs_define
class AnthropicProviderOptionsAnthropic:
    """
    Attributes:
        thinking (AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled |
            AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled | Unset):
        web_search (AnthropicProviderOptionsAnthropicAnthropicWebSearch | Unset):
    """

    thinking: (
        AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled
        | AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled
        | Unset
    ) = UNSET
    web_search: AnthropicProviderOptionsAnthropicAnthropicWebSearch | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.anthropic_provider_options_anthropic_anthropic_thinking_enabled import (
            AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled,
        )

        thinking: dict[str, Any] | Unset
        if isinstance(self.thinking, Unset):
            thinking = UNSET
        elif isinstance(self.thinking, AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled):
            thinking = self.thinking.to_dict()
        else:
            thinking = self.thinking.to_dict()

        web_search: dict[str, Any] | Unset = UNSET
        if not isinstance(self.web_search, Unset):
            web_search = self.web_search.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if thinking is not UNSET:
            field_dict["thinking"] = thinking
        if web_search is not UNSET:
            field_dict["webSearch"] = web_search

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.anthropic_provider_options_anthropic_anthropic_thinking_disabled import (
            AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled,
        )
        from ..models.anthropic_provider_options_anthropic_anthropic_thinking_enabled import (
            AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled,
        )
        from ..models.anthropic_provider_options_anthropic_anthropic_web_search import (
            AnthropicProviderOptionsAnthropicAnthropicWebSearch,
        )

        d = dict(src_dict)

        def _parse_thinking(
            data: object,
        ) -> (
            AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled
            | AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled
            | Unset
        ):
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                thinking_anthropic_thinking_enabled = (
                    AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled.from_dict(data)
                )

                return thinking_anthropic_thinking_enabled
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            thinking_anthropic_thinking_disabled = AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled.from_dict(
                data
            )

            return thinking_anthropic_thinking_disabled

        thinking = _parse_thinking(d.pop("thinking", UNSET))

        _web_search = d.pop("webSearch", UNSET)
        web_search: AnthropicProviderOptionsAnthropicAnthropicWebSearch | Unset
        if isinstance(_web_search, Unset):
            web_search = UNSET
        else:
            web_search = AnthropicProviderOptionsAnthropicAnthropicWebSearch.from_dict(_web_search)

        anthropic_provider_options_anthropic = cls(
            thinking=thinking,
            web_search=web_search,
        )

        return anthropic_provider_options_anthropic
