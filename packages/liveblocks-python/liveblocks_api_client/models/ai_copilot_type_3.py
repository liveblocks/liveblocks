from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.copilot_settings import CopilotSettings


T = TypeVar("T", bound="AiCopilotType3")


@_attrs_define
class AiCopilotType3:
    """
    Attributes:
        type_ (Literal['copilot']):
        id (str):
        name (str):
        system_prompt (str):
        provider (Literal['openai-compatible']):
        provider_model (str):
        compatible_provider_name (str):
        provider_base_url (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        description (str | Unset):
        knowledge_prompt (str | Unset):
        always_use_knowledge (bool | Unset):
        last_used_at (datetime.datetime | Unset):
        settings (CopilotSettings | Unset):
    """

    type_: Literal["copilot"]
    id: str
    name: str
    system_prompt: str
    provider: Literal["openai-compatible"]
    provider_model: str
    compatible_provider_name: str
    provider_base_url: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    description: str | Unset = UNSET
    knowledge_prompt: str | Unset = UNSET
    always_use_knowledge: bool | Unset = UNSET
    last_used_at: datetime.datetime | Unset = UNSET
    settings: CopilotSettings | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        id = self.id

        name = self.name

        system_prompt = self.system_prompt

        provider = self.provider

        provider_model = self.provider_model

        compatible_provider_name = self.compatible_provider_name

        provider_base_url = self.provider_base_url

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        description = self.description

        knowledge_prompt = self.knowledge_prompt

        always_use_knowledge = self.always_use_knowledge

        last_used_at: str | Unset = UNSET
        if not isinstance(self.last_used_at, Unset):
            last_used_at = self.last_used_at.isoformat()

        settings: dict[str, Any] | Unset = UNSET
        if not isinstance(self.settings, Unset):
            settings = self.settings.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "id": id,
                "name": name,
                "systemPrompt": system_prompt,
                "provider": provider,
                "providerModel": provider_model,
                "compatibleProviderName": compatible_provider_name,
                "providerBaseUrl": provider_base_url,
                "createdAt": created_at,
                "updatedAt": updated_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if knowledge_prompt is not UNSET:
            field_dict["knowledgePrompt"] = knowledge_prompt
        if always_use_knowledge is not UNSET:
            field_dict["alwaysUseKnowledge"] = always_use_knowledge
        if last_used_at is not UNSET:
            field_dict["lastUsedAt"] = last_used_at
        if settings is not UNSET:
            field_dict["settings"] = settings

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.copilot_settings import CopilotSettings

        d = dict(src_dict)
        type_ = cast(Literal["copilot"], d.pop("type"))
        if type_ != "copilot":
            raise ValueError(f"type must match const 'copilot', got '{type_}'")

        id = d.pop("id")

        name = d.pop("name")

        system_prompt = d.pop("systemPrompt")

        provider = cast(Literal["openai-compatible"], d.pop("provider"))
        if provider != "openai-compatible":
            raise ValueError(f"provider must match const 'openai-compatible', got '{provider}'")

        provider_model = d.pop("providerModel")

        compatible_provider_name = d.pop("compatibleProviderName")

        provider_base_url = d.pop("providerBaseUrl")

        created_at = isoparse(d.pop("createdAt"))

        updated_at = isoparse(d.pop("updatedAt"))

        description = d.pop("description", UNSET)

        knowledge_prompt = d.pop("knowledgePrompt", UNSET)

        always_use_knowledge = d.pop("alwaysUseKnowledge", UNSET)

        _last_used_at = d.pop("lastUsedAt", UNSET)
        last_used_at: datetime.datetime | Unset
        if isinstance(_last_used_at, Unset):
            last_used_at = UNSET
        else:
            last_used_at = isoparse(_last_used_at)

        _settings = d.pop("settings", UNSET)
        settings: CopilotSettings | Unset
        if isinstance(_settings, Unset):
            settings = UNSET
        else:
            settings = CopilotSettings.from_dict(_settings)

        ai_copilot_type_3 = cls(
            type_=type_,
            id=id,
            name=name,
            system_prompt=system_prompt,
            provider=provider,
            provider_model=provider_model,
            compatible_provider_name=compatible_provider_name,
            provider_base_url=provider_base_url,
            created_at=created_at,
            updated_at=updated_at,
            description=description,
            knowledge_prompt=knowledge_prompt,
            always_use_knowledge=always_use_knowledge,
            last_used_at=last_used_at,
            settings=settings,
        )

        ai_copilot_type_3.additional_properties = d
        return ai_copilot_type_3

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
