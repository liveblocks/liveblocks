from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..models.open_ai_provider_options_openai_reasoning_effort import OpenAiProviderOptionsOpenaiReasoningEffort
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.open_ai_provider_options_openai_web_search import OpenAiProviderOptionsOpenaiWebSearch


@_attrs_define
class OpenAiProviderOptionsOpenai:
    """
    Attributes:
        reasoning_effort (OpenAiProviderOptionsOpenaiReasoningEffort | Unset):
        web_search (OpenAiProviderOptionsOpenaiWebSearch | Unset):
    """

    reasoning_effort: OpenAiProviderOptionsOpenaiReasoningEffort | Unset = UNSET
    web_search: OpenAiProviderOptionsOpenaiWebSearch | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        reasoning_effort: str | Unset = UNSET
        if not isinstance(self.reasoning_effort, Unset):
            reasoning_effort = self.reasoning_effort.value

        web_search: dict[str, Any] | Unset = UNSET
        if not isinstance(self.web_search, Unset):
            web_search = self.web_search.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if reasoning_effort is not UNSET:
            field_dict["reasoningEffort"] = reasoning_effort
        if web_search is not UNSET:
            field_dict["webSearch"] = web_search

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.open_ai_provider_options_openai_web_search import OpenAiProviderOptionsOpenaiWebSearch

        d = dict(src_dict)
        _reasoning_effort = d.pop("reasoningEffort", UNSET)
        reasoning_effort: OpenAiProviderOptionsOpenaiReasoningEffort | Unset
        if isinstance(_reasoning_effort, Unset):
            reasoning_effort = UNSET
        else:
            reasoning_effort = OpenAiProviderOptionsOpenaiReasoningEffort(_reasoning_effort)

        _web_search = d.pop("webSearch", UNSET)
        web_search: OpenAiProviderOptionsOpenaiWebSearch | Unset
        if isinstance(_web_search, Unset):
            web_search = UNSET
        else:
            web_search = OpenAiProviderOptionsOpenaiWebSearch.from_dict(_web_search)

        open_ai_provider_options_openai = cls(
            reasoning_effort=reasoning_effort,
            web_search=web_search,
        )

        return open_ai_provider_options_openai
