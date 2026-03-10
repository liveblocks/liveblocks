from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings


@_attrs_define
class CreateAiCopilotOptionsBase:
    """
    Attributes:
        name (str):
        system_prompt (str):
        provider_api_key (str):
        description (str | Unset):
        knowledge_prompt (str | Unset):
        always_use_knowledge (bool | Unset):
        settings (AiCopilotProviderSettings | Unset):
    """

    name: str
    system_prompt: str
    provider_api_key: str
    description: str | Unset = UNSET
    knowledge_prompt: str | Unset = UNSET
    always_use_knowledge: bool | Unset = UNSET
    settings: AiCopilotProviderSettings | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        system_prompt = self.system_prompt

        provider_api_key = self.provider_api_key

        description = self.description

        knowledge_prompt = self.knowledge_prompt

        always_use_knowledge = self.always_use_knowledge

        settings: dict[str, Any] | Unset = UNSET
        if not isinstance(self.settings, Unset):
            settings = self.settings.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "name": name,
                "systemPrompt": system_prompt,
                "providerApiKey": provider_api_key,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if knowledge_prompt is not UNSET:
            field_dict["knowledgePrompt"] = knowledge_prompt
        if always_use_knowledge is not UNSET:
            field_dict["alwaysUseKnowledge"] = always_use_knowledge
        if settings is not UNSET:
            field_dict["settings"] = settings

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings

        d = dict(src_dict)
        name = d.pop("name")

        system_prompt = d.pop("systemPrompt")

        provider_api_key = d.pop("providerApiKey")

        description = d.pop("description", UNSET)

        knowledge_prompt = d.pop("knowledgePrompt", UNSET)

        always_use_knowledge = d.pop("alwaysUseKnowledge", UNSET)

        _settings = d.pop("settings", UNSET)
        settings: AiCopilotProviderSettings | Unset
        if isinstance(_settings, Unset):
            settings = UNSET
        else:
            settings = AiCopilotProviderSettings.from_dict(_settings)

        create_ai_copilot_options_base = cls(
            name=name,
            system_prompt=system_prompt,
            provider_api_key=provider_api_key,
            description=description,
            knowledge_prompt=knowledge_prompt,
            always_use_knowledge=always_use_knowledge,
            settings=settings,
        )

        return create_ai_copilot_options_base
