from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_ai_copilot_provider_options_type_1_anthropic_thinking_type_0 import (
        CreateAiCopilotProviderOptionsType1AnthropicThinkingType0,
    )
    from ..models.create_ai_copilot_provider_options_type_1_anthropic_thinking_type_1 import (
        CreateAiCopilotProviderOptionsType1AnthropicThinkingType1,
    )
    from ..models.create_ai_copilot_provider_options_type_1_anthropic_web_search import (
        CreateAiCopilotProviderOptionsType1AnthropicWebSearch,
    )


T = TypeVar("T", bound="CreateAiCopilotProviderOptionsType1Anthropic")


@_attrs_define
class CreateAiCopilotProviderOptionsType1Anthropic:
    """
    Attributes:
        thinking (CreateAiCopilotProviderOptionsType1AnthropicThinkingType0 |
            CreateAiCopilotProviderOptionsType1AnthropicThinkingType1 | Unset):
        web_search (CreateAiCopilotProviderOptionsType1AnthropicWebSearch | Unset):
    """

    thinking: (
        CreateAiCopilotProviderOptionsType1AnthropicThinkingType0
        | CreateAiCopilotProviderOptionsType1AnthropicThinkingType1
        | Unset
    ) = UNSET
    web_search: CreateAiCopilotProviderOptionsType1AnthropicWebSearch | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.create_ai_copilot_provider_options_type_1_anthropic_thinking_type_0 import (
            CreateAiCopilotProviderOptionsType1AnthropicThinkingType0,
        )

        thinking: dict[str, Any] | Unset
        if isinstance(self.thinking, Unset):
            thinking = UNSET
        elif isinstance(self.thinking, CreateAiCopilotProviderOptionsType1AnthropicThinkingType0):
            thinking = self.thinking.to_dict()
        else:
            thinking = self.thinking.to_dict()

        web_search: dict[str, Any] | Unset = UNSET
        if not isinstance(self.web_search, Unset):
            web_search = self.web_search.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if thinking is not UNSET:
            field_dict["thinking"] = thinking
        if web_search is not UNSET:
            field_dict["webSearch"] = web_search

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_ai_copilot_provider_options_type_1_anthropic_thinking_type_0 import (
            CreateAiCopilotProviderOptionsType1AnthropicThinkingType0,
        )
        from ..models.create_ai_copilot_provider_options_type_1_anthropic_thinking_type_1 import (
            CreateAiCopilotProviderOptionsType1AnthropicThinkingType1,
        )
        from ..models.create_ai_copilot_provider_options_type_1_anthropic_web_search import (
            CreateAiCopilotProviderOptionsType1AnthropicWebSearch,
        )

        d = dict(src_dict)

        def _parse_thinking(
            data: object,
        ) -> (
            CreateAiCopilotProviderOptionsType1AnthropicThinkingType0
            | CreateAiCopilotProviderOptionsType1AnthropicThinkingType1
            | Unset
        ):
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                thinking_type_0 = CreateAiCopilotProviderOptionsType1AnthropicThinkingType0.from_dict(data)

                return thinking_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            thinking_type_1 = CreateAiCopilotProviderOptionsType1AnthropicThinkingType1.from_dict(data)

            return thinking_type_1

        thinking = _parse_thinking(d.pop("thinking", UNSET))

        _web_search = d.pop("webSearch", UNSET)
        web_search: CreateAiCopilotProviderOptionsType1AnthropicWebSearch | Unset
        if isinstance(_web_search, Unset):
            web_search = UNSET
        else:
            web_search = CreateAiCopilotProviderOptionsType1AnthropicWebSearch.from_dict(_web_search)

        create_ai_copilot_provider_options_type_1_anthropic = cls(
            thinking=thinking,
            web_search=web_search,
        )

        create_ai_copilot_provider_options_type_1_anthropic.additional_properties = d
        return create_ai_copilot_provider_options_type_1_anthropic

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
