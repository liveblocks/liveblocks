from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.create_ai_copilot_provider_options_type_0_openai_reasoning_effort import (
    CreateAiCopilotProviderOptionsType0OpenaiReasoningEffort,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_ai_copilot_provider_options_type_0_openai_web_search import (
        CreateAiCopilotProviderOptionsType0OpenaiWebSearch,
    )


T = TypeVar("T", bound="CreateAiCopilotProviderOptionsType0Openai")


@_attrs_define
class CreateAiCopilotProviderOptionsType0Openai:
    """
    Attributes:
        reasoning_effort (CreateAiCopilotProviderOptionsType0OpenaiReasoningEffort | Unset):
        web_search (CreateAiCopilotProviderOptionsType0OpenaiWebSearch | Unset):
    """

    reasoning_effort: CreateAiCopilotProviderOptionsType0OpenaiReasoningEffort | Unset = UNSET
    web_search: CreateAiCopilotProviderOptionsType0OpenaiWebSearch | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        reasoning_effort: str | Unset = UNSET
        if not isinstance(self.reasoning_effort, Unset):
            reasoning_effort = self.reasoning_effort.value

        web_search: dict[str, Any] | Unset = UNSET
        if not isinstance(self.web_search, Unset):
            web_search = self.web_search.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if reasoning_effort is not UNSET:
            field_dict["reasoningEffort"] = reasoning_effort
        if web_search is not UNSET:
            field_dict["webSearch"] = web_search

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_ai_copilot_provider_options_type_0_openai_web_search import (
            CreateAiCopilotProviderOptionsType0OpenaiWebSearch,
        )

        d = dict(src_dict)
        _reasoning_effort = d.pop("reasoningEffort", UNSET)
        reasoning_effort: CreateAiCopilotProviderOptionsType0OpenaiReasoningEffort | Unset
        if isinstance(_reasoning_effort, Unset):
            reasoning_effort = UNSET
        else:
            reasoning_effort = CreateAiCopilotProviderOptionsType0OpenaiReasoningEffort(_reasoning_effort)

        _web_search = d.pop("webSearch", UNSET)
        web_search: CreateAiCopilotProviderOptionsType0OpenaiWebSearch | Unset
        if isinstance(_web_search, Unset):
            web_search = UNSET
        else:
            web_search = CreateAiCopilotProviderOptionsType0OpenaiWebSearch.from_dict(_web_search)

        create_ai_copilot_provider_options_type_0_openai = cls(
            reasoning_effort=reasoning_effort,
            web_search=web_search,
        )

        create_ai_copilot_provider_options_type_0_openai.additional_properties = d
        return create_ai_copilot_provider_options_type_0_openai

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
