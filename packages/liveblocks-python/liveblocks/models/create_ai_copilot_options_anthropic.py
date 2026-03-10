from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.anthropic_model import AnthropicModel
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings
    from ..models.anthropic_provider_options import AnthropicProviderOptions


@_attrs_define
class CreateAiCopilotOptionsAnthropic:
    """
    Attributes:
        name (str):
        system_prompt (str):
        provider_api_key (str):
        provider (Literal['anthropic']):
        provider_model (AnthropicModel):
        description (str | Unset):
        knowledge_prompt (str | Unset):
        always_use_knowledge (bool | Unset):
        settings (AiCopilotProviderSettings | Unset):
        provider_options (AnthropicProviderOptions | Unset):
    """

    name: str
    system_prompt: str
    provider_api_key: str
    provider: Literal["anthropic"]
    provider_model: AnthropicModel
    description: str | Unset = UNSET
    knowledge_prompt: str | Unset = UNSET
    always_use_knowledge: bool | Unset = UNSET
    settings: AiCopilotProviderSettings | Unset = UNSET
    provider_options: AnthropicProviderOptions | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        system_prompt = self.system_prompt

        provider_api_key = self.provider_api_key

        provider = self.provider

        provider_model = self.provider_model.value

        description = self.description

        knowledge_prompt = self.knowledge_prompt

        always_use_knowledge = self.always_use_knowledge

        settings: dict[str, Any] | Unset = UNSET
        if not isinstance(self.settings, Unset):
            settings = self.settings.to_dict()

        provider_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.provider_options, Unset):
            provider_options = self.provider_options.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "systemPrompt": system_prompt,
                "providerApiKey": provider_api_key,
                "provider": provider,
                "providerModel": provider_model,
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
        if provider_options is not UNSET:
            field_dict["providerOptions"] = provider_options

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings
        from ..models.anthropic_provider_options import AnthropicProviderOptions

        d = dict(src_dict)
        name = d.pop("name")

        system_prompt = d.pop("systemPrompt")

        provider_api_key = d.pop("providerApiKey")

        provider = cast(Literal["anthropic"], d.pop("provider"))
        if provider != "anthropic":
            raise ValueError(f"provider must match const 'anthropic', got '{provider}'")

        provider_model = AnthropicModel(d.pop("providerModel"))

        description = d.pop("description", UNSET)

        knowledge_prompt = d.pop("knowledgePrompt", UNSET)

        always_use_knowledge = d.pop("alwaysUseKnowledge", UNSET)

        _settings = d.pop("settings", UNSET)
        settings: AiCopilotProviderSettings | Unset
        if isinstance(_settings, Unset):
            settings = UNSET
        else:
            settings = AiCopilotProviderSettings.from_dict(_settings)

        _provider_options = d.pop("providerOptions", UNSET)
        provider_options: AnthropicProviderOptions | Unset
        if isinstance(_provider_options, Unset):
            provider_options = UNSET
        else:
            provider_options = AnthropicProviderOptions.from_dict(_provider_options)

        create_ai_copilot_options_anthropic = cls(
            name=name,
            system_prompt=system_prompt,
            provider_api_key=provider_api_key,
            provider=provider,
            provider_model=provider_model,
            description=description,
            knowledge_prompt=knowledge_prompt,
            always_use_knowledge=always_use_knowledge,
            settings=settings,
            provider_options=provider_options,
        )

        create_ai_copilot_options_anthropic.additional_properties = d
        return create_ai_copilot_options_anthropic

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
