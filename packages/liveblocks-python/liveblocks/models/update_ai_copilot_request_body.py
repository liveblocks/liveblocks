from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.update_ai_copilot_request_body_provider import UpdateAiCopilotRequestBodyProvider
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings
    from ..models.anthropic_provider_options import AnthropicProviderOptions
    from ..models.google_provider_options import GoogleProviderOptions
    from ..models.open_ai_provider_options import OpenAiProviderOptions


T = TypeVar("T", bound="UpdateAiCopilotRequestBody")


@_attrs_define
class UpdateAiCopilotRequestBody:
    """
    Attributes:
        name (str | Unset):
        description (None | str | Unset):
        system_prompt (str | Unset):
        knowledge_prompt (None | str | Unset):
        always_use_knowledge (bool | Unset):
        settings (AiCopilotProviderSettings | None | Unset):
        provider_api_key (str | Unset):
        provider (UpdateAiCopilotRequestBodyProvider | Unset):
        provider_model (str | Unset):
        provider_options (AnthropicProviderOptions | GoogleProviderOptions | None | OpenAiProviderOptions | Unset):
        compatible_provider_name (str | Unset):
        provider_base_url (str | Unset):
    """

    name: str | Unset = UNSET
    description: None | str | Unset = UNSET
    system_prompt: str | Unset = UNSET
    knowledge_prompt: None | str | Unset = UNSET
    always_use_knowledge: bool | Unset = UNSET
    settings: AiCopilotProviderSettings | None | Unset = UNSET
    provider_api_key: str | Unset = UNSET
    provider: UpdateAiCopilotRequestBodyProvider | Unset = UNSET
    provider_model: str | Unset = UNSET
    provider_options: AnthropicProviderOptions | GoogleProviderOptions | None | OpenAiProviderOptions | Unset = UNSET
    compatible_provider_name: str | Unset = UNSET
    provider_base_url: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings
        from ..models.anthropic_provider_options import AnthropicProviderOptions
        from ..models.google_provider_options import GoogleProviderOptions
        from ..models.open_ai_provider_options import OpenAiProviderOptions

        name = self.name

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        system_prompt = self.system_prompt

        knowledge_prompt: None | str | Unset
        if isinstance(self.knowledge_prompt, Unset):
            knowledge_prompt = UNSET
        else:
            knowledge_prompt = self.knowledge_prompt

        always_use_knowledge = self.always_use_knowledge

        settings: dict[str, Any] | None | Unset
        if isinstance(self.settings, Unset):
            settings = UNSET
        elif isinstance(self.settings, AiCopilotProviderSettings):
            settings = self.settings.to_dict()
        else:
            settings = self.settings

        provider_api_key = self.provider_api_key

        provider: str | Unset = UNSET
        if not isinstance(self.provider, Unset):
            provider = self.provider.value

        provider_model = self.provider_model

        provider_options: dict[str, Any] | None | Unset
        if isinstance(self.provider_options, Unset):
            provider_options = UNSET
        elif isinstance(self.provider_options, OpenAiProviderOptions):
            provider_options = self.provider_options.to_dict()
        elif isinstance(self.provider_options, AnthropicProviderOptions):
            provider_options = self.provider_options.to_dict()
        elif isinstance(self.provider_options, GoogleProviderOptions):
            provider_options = self.provider_options.to_dict()
        else:
            provider_options = self.provider_options

        compatible_provider_name = self.compatible_provider_name

        provider_base_url = self.provider_base_url

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description
        if system_prompt is not UNSET:
            field_dict["systemPrompt"] = system_prompt
        if knowledge_prompt is not UNSET:
            field_dict["knowledgePrompt"] = knowledge_prompt
        if always_use_knowledge is not UNSET:
            field_dict["alwaysUseKnowledge"] = always_use_knowledge
        if settings is not UNSET:
            field_dict["settings"] = settings
        if provider_api_key is not UNSET:
            field_dict["providerApiKey"] = provider_api_key
        if provider is not UNSET:
            field_dict["provider"] = provider
        if provider_model is not UNSET:
            field_dict["providerModel"] = provider_model
        if provider_options is not UNSET:
            field_dict["providerOptions"] = provider_options
        if compatible_provider_name is not UNSET:
            field_dict["compatibleProviderName"] = compatible_provider_name
        if provider_base_url is not UNSET:
            field_dict["providerBaseUrl"] = provider_base_url

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings
        from ..models.anthropic_provider_options import AnthropicProviderOptions
        from ..models.google_provider_options import GoogleProviderOptions
        from ..models.open_ai_provider_options import OpenAiProviderOptions

        d = dict(src_dict)
        name = d.pop("name", UNSET)

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        system_prompt = d.pop("systemPrompt", UNSET)

        def _parse_knowledge_prompt(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        knowledge_prompt = _parse_knowledge_prompt(d.pop("knowledgePrompt", UNSET))

        always_use_knowledge = d.pop("alwaysUseKnowledge", UNSET)

        def _parse_settings(data: object) -> AiCopilotProviderSettings | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                settings_type_0 = AiCopilotProviderSettings.from_dict(data)

                return settings_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AiCopilotProviderSettings | None | Unset, data)

        settings = _parse_settings(d.pop("settings", UNSET))

        provider_api_key = d.pop("providerApiKey", UNSET)

        _provider = d.pop("provider", UNSET)
        provider: UpdateAiCopilotRequestBodyProvider | Unset
        if isinstance(_provider, Unset):
            provider = UNSET
        else:
            provider = UpdateAiCopilotRequestBodyProvider(_provider)

        provider_model = d.pop("providerModel", UNSET)

        def _parse_provider_options(
            data: object,
        ) -> AnthropicProviderOptions | GoogleProviderOptions | None | OpenAiProviderOptions | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                provider_options_type_0 = OpenAiProviderOptions.from_dict(data)

                return provider_options_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                provider_options_type_1 = AnthropicProviderOptions.from_dict(data)

                return provider_options_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                provider_options_type_2 = GoogleProviderOptions.from_dict(data)

                return provider_options_type_2
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AnthropicProviderOptions | GoogleProviderOptions | None | OpenAiProviderOptions | Unset, data)

        provider_options = _parse_provider_options(d.pop("providerOptions", UNSET))

        compatible_provider_name = d.pop("compatibleProviderName", UNSET)

        provider_base_url = d.pop("providerBaseUrl", UNSET)

        update_ai_copilot_request_body = cls(
            name=name,
            description=description,
            system_prompt=system_prompt,
            knowledge_prompt=knowledge_prompt,
            always_use_knowledge=always_use_knowledge,
            settings=settings,
            provider_api_key=provider_api_key,
            provider=provider,
            provider_model=provider_model,
            provider_options=provider_options,
            compatible_provider_name=compatible_provider_name,
            provider_base_url=provider_base_url,
        )

        return update_ai_copilot_request_body
