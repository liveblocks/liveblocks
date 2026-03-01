from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.update_ai_copilot_provider import UpdateAiCopilotProvider
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.copilot_settings import CopilotSettings
    from ..models.update_ai_copilot_provider_options_type_0 import UpdateAiCopilotProviderOptionsType0
    from ..models.update_ai_copilot_provider_options_type_1 import UpdateAiCopilotProviderOptionsType1
    from ..models.update_ai_copilot_provider_options_type_2 import UpdateAiCopilotProviderOptionsType2


T = TypeVar("T", bound="UpdateAiCopilot")


@_attrs_define
class UpdateAiCopilot:
    """
    Attributes:
        name (str | Unset):
        description (None | str | Unset):
        system_prompt (str | Unset):
        knowledge_prompt (None | str | Unset):
        always_use_knowledge (bool | None | Unset):
        provider_api_key (str | Unset):
        provider_model (str | Unset):
        provider_options (None | Unset | UpdateAiCopilotProviderOptionsType0 | UpdateAiCopilotProviderOptionsType1 |
            UpdateAiCopilotProviderOptionsType2):
        settings (CopilotSettings | Unset):
        provider (UpdateAiCopilotProvider | Unset):
        compatible_provider_name (str | Unset):
        provider_base_url (str | Unset):
    """

    name: str | Unset = UNSET
    description: None | str | Unset = UNSET
    system_prompt: str | Unset = UNSET
    knowledge_prompt: None | str | Unset = UNSET
    always_use_knowledge: bool | None | Unset = UNSET
    provider_api_key: str | Unset = UNSET
    provider_model: str | Unset = UNSET
    provider_options: (
        None
        | Unset
        | UpdateAiCopilotProviderOptionsType0
        | UpdateAiCopilotProviderOptionsType1
        | UpdateAiCopilotProviderOptionsType2
    ) = UNSET
    settings: CopilotSettings | Unset = UNSET
    provider: UpdateAiCopilotProvider | Unset = UNSET
    compatible_provider_name: str | Unset = UNSET
    provider_base_url: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.update_ai_copilot_provider_options_type_0 import UpdateAiCopilotProviderOptionsType0
        from ..models.update_ai_copilot_provider_options_type_1 import UpdateAiCopilotProviderOptionsType1
        from ..models.update_ai_copilot_provider_options_type_2 import UpdateAiCopilotProviderOptionsType2

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

        always_use_knowledge: bool | None | Unset
        if isinstance(self.always_use_knowledge, Unset):
            always_use_knowledge = UNSET
        else:
            always_use_knowledge = self.always_use_knowledge

        provider_api_key = self.provider_api_key

        provider_model = self.provider_model

        provider_options: dict[str, Any] | None | Unset
        if isinstance(self.provider_options, Unset):
            provider_options = UNSET
        elif isinstance(self.provider_options, UpdateAiCopilotProviderOptionsType0):
            provider_options = self.provider_options.to_dict()
        elif isinstance(self.provider_options, UpdateAiCopilotProviderOptionsType1):
            provider_options = self.provider_options.to_dict()
        elif isinstance(self.provider_options, UpdateAiCopilotProviderOptionsType2):
            provider_options = self.provider_options.to_dict()
        else:
            provider_options = self.provider_options

        settings: dict[str, Any] | Unset = UNSET
        if not isinstance(self.settings, Unset):
            settings = self.settings.to_dict()

        provider: str | Unset = UNSET
        if not isinstance(self.provider, Unset):
            provider = self.provider.value

        compatible_provider_name = self.compatible_provider_name

        provider_base_url = self.provider_base_url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
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
        if provider_api_key is not UNSET:
            field_dict["providerApiKey"] = provider_api_key
        if provider_model is not UNSET:
            field_dict["providerModel"] = provider_model
        if provider_options is not UNSET:
            field_dict["providerOptions"] = provider_options
        if settings is not UNSET:
            field_dict["settings"] = settings
        if provider is not UNSET:
            field_dict["provider"] = provider
        if compatible_provider_name is not UNSET:
            field_dict["compatibleProviderName"] = compatible_provider_name
        if provider_base_url is not UNSET:
            field_dict["providerBaseUrl"] = provider_base_url

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.copilot_settings import CopilotSettings
        from ..models.update_ai_copilot_provider_options_type_0 import UpdateAiCopilotProviderOptionsType0
        from ..models.update_ai_copilot_provider_options_type_1 import UpdateAiCopilotProviderOptionsType1
        from ..models.update_ai_copilot_provider_options_type_2 import UpdateAiCopilotProviderOptionsType2

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

        def _parse_always_use_knowledge(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        always_use_knowledge = _parse_always_use_knowledge(d.pop("alwaysUseKnowledge", UNSET))

        provider_api_key = d.pop("providerApiKey", UNSET)

        provider_model = d.pop("providerModel", UNSET)

        def _parse_provider_options(
            data: object,
        ) -> (
            None
            | Unset
            | UpdateAiCopilotProviderOptionsType0
            | UpdateAiCopilotProviderOptionsType1
            | UpdateAiCopilotProviderOptionsType2
        ):
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                provider_options_type_0 = UpdateAiCopilotProviderOptionsType0.from_dict(data)

                return provider_options_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                provider_options_type_1 = UpdateAiCopilotProviderOptionsType1.from_dict(data)

                return provider_options_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                provider_options_type_2 = UpdateAiCopilotProviderOptionsType2.from_dict(data)

                return provider_options_type_2
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                None
                | Unset
                | UpdateAiCopilotProviderOptionsType0
                | UpdateAiCopilotProviderOptionsType1
                | UpdateAiCopilotProviderOptionsType2,
                data,
            )

        provider_options = _parse_provider_options(d.pop("providerOptions", UNSET))

        _settings = d.pop("settings", UNSET)
        settings: CopilotSettings | Unset
        if isinstance(_settings, Unset):
            settings = UNSET
        else:
            settings = CopilotSettings.from_dict(_settings)

        _provider = d.pop("provider", UNSET)
        provider: UpdateAiCopilotProvider | Unset
        if isinstance(_provider, Unset):
            provider = UNSET
        else:
            provider = UpdateAiCopilotProvider(_provider)

        compatible_provider_name = d.pop("compatibleProviderName", UNSET)

        provider_base_url = d.pop("providerBaseUrl", UNSET)

        update_ai_copilot = cls(
            name=name,
            description=description,
            system_prompt=system_prompt,
            knowledge_prompt=knowledge_prompt,
            always_use_knowledge=always_use_knowledge,
            provider_api_key=provider_api_key,
            provider_model=provider_model,
            provider_options=provider_options,
            settings=settings,
            provider=provider,
            compatible_provider_name=compatible_provider_name,
            provider_base_url=provider_base_url,
        )

        update_ai_copilot.additional_properties = d
        return update_ai_copilot

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
