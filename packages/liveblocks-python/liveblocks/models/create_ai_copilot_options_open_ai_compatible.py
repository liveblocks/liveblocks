from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings


@_attrs_define
class CreateAiCopilotOptionsOpenAiCompatible:
    """
    Example:
        {'name': 'My Compatible Copilot', 'systemPrompt': 'You are a helpful assistant.', 'providerApiKey': 'sk-...',
            'provider': 'openai-compatible', 'providerModel': 'my-custom-model', 'compatibleProviderName': 'my-provider',
            'providerBaseUrl': 'https://api.my-provider.com/v1'}

    Attributes:
        name (str):
        system_prompt (str):
        provider_api_key (str):
        provider (Literal['openai-compatible']):
        provider_model (str):
        compatible_provider_name (str):
        provider_base_url (str):
        description (str | Unset):
        knowledge_prompt (str | Unset):
        always_use_knowledge (bool | Unset):
        settings (AiCopilotProviderSettings | Unset):  Example: {'maxTokens': 4096, 'temperature': 0.7, 'topP': 0.9}.
    """

    name: str
    system_prompt: str
    provider_api_key: str
    provider: Literal["openai-compatible"]
    provider_model: str
    compatible_provider_name: str
    provider_base_url: str
    description: str | Unset = UNSET
    knowledge_prompt: str | Unset = UNSET
    always_use_knowledge: bool | Unset = UNSET
    settings: AiCopilotProviderSettings | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        system_prompt = self.system_prompt

        provider_api_key = self.provider_api_key

        provider = self.provider

        provider_model = self.provider_model

        compatible_provider_name = self.compatible_provider_name

        provider_base_url = self.provider_base_url

        description = self.description

        knowledge_prompt = self.knowledge_prompt

        always_use_knowledge = self.always_use_knowledge

        settings: dict[str, Any] | Unset = UNSET
        if not isinstance(self.settings, Unset):
            settings = self.settings.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "systemPrompt": system_prompt,
                "providerApiKey": provider_api_key,
                "provider": provider,
                "providerModel": provider_model,
                "compatibleProviderName": compatible_provider_name,
                "providerBaseUrl": provider_base_url,
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

        provider = cast(Literal["openai-compatible"], d.pop("provider"))
        if provider != "openai-compatible":
            raise ValueError(f"provider must match const 'openai-compatible', got '{provider}'")

        provider_model = d.pop("providerModel")

        compatible_provider_name = d.pop("compatibleProviderName")

        provider_base_url = d.pop("providerBaseUrl")

        description = d.pop("description", UNSET)

        knowledge_prompt = d.pop("knowledgePrompt", UNSET)

        always_use_knowledge = d.pop("alwaysUseKnowledge", UNSET)

        _settings = d.pop("settings", UNSET)
        settings: AiCopilotProviderSettings | Unset
        if isinstance(_settings, Unset):
            settings = UNSET
        else:
            settings = AiCopilotProviderSettings.from_dict(_settings)

        create_ai_copilot_options_open_ai_compatible = cls(
            name=name,
            system_prompt=system_prompt,
            provider_api_key=provider_api_key,
            provider=provider,
            provider_model=provider_model,
            compatible_provider_name=compatible_provider_name,
            provider_base_url=provider_base_url,
            description=description,
            knowledge_prompt=knowledge_prompt,
            always_use_knowledge=always_use_knowledge,
            settings=settings,
        )

        create_ai_copilot_options_open_ai_compatible.additional_properties = d
        return create_ai_copilot_options_open_ai_compatible

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
