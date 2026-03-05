from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..models.open_ai_model import OpenAiModel
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings


T = TypeVar("T", bound="AiCopilotOpenAi")


@_attrs_define
class AiCopilotOpenAi:
    """
    Attributes:
        type_ (Literal['copilot']):
        id (str):
        name (str):
        system_prompt (str):
        always_use_knowledge (bool):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        provider (Literal['openai']):
        provider_model (OpenAiModel):
        description (str | Unset):
        knowledge_prompt (str | Unset):
        last_used_at (datetime.datetime | Unset):
        settings (AiCopilotProviderSettings | Unset):
    """

    type_: Literal["copilot"]
    id: str
    name: str
    system_prompt: str
    always_use_knowledge: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    provider: Literal["openai"]
    provider_model: OpenAiModel
    description: str | Unset = UNSET
    knowledge_prompt: str | Unset = UNSET
    last_used_at: datetime.datetime | Unset = UNSET
    settings: AiCopilotProviderSettings | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        id = self.id

        name = self.name

        system_prompt = self.system_prompt

        always_use_knowledge = self.always_use_knowledge

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        provider = self.provider

        provider_model = self.provider_model.value

        description = self.description

        knowledge_prompt = self.knowledge_prompt

        last_used_at: str | Unset = UNSET
        if not isinstance(self.last_used_at, Unset):
            last_used_at = self.last_used_at.isoformat()

        settings: dict[str, Any] | Unset = UNSET
        if not isinstance(self.settings, Unset):
            settings = self.settings.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "type": type_,
                "id": id,
                "name": name,
                "systemPrompt": system_prompt,
                "alwaysUseKnowledge": always_use_knowledge,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "provider": provider,
                "providerModel": provider_model,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if knowledge_prompt is not UNSET:
            field_dict["knowledgePrompt"] = knowledge_prompt
        if last_used_at is not UNSET:
            field_dict["lastUsedAt"] = last_used_at
        if settings is not UNSET:
            field_dict["settings"] = settings

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings

        d = dict(src_dict)
        type_ = cast(Literal["copilot"], d.pop("type"))
        if type_ != "copilot":
            raise ValueError(f"type must match const 'copilot', got '{type_}'")

        id = d.pop("id")

        name = d.pop("name")

        system_prompt = d.pop("systemPrompt")

        always_use_knowledge = d.pop("alwaysUseKnowledge")

        created_at = isoparse(d.pop("createdAt"))

        updated_at = isoparse(d.pop("updatedAt"))

        provider = cast(Literal["openai"], d.pop("provider"))
        if provider != "openai":
            raise ValueError(f"provider must match const 'openai', got '{provider}'")

        provider_model = OpenAiModel(d.pop("providerModel"))

        description = d.pop("description", UNSET)

        knowledge_prompt = d.pop("knowledgePrompt", UNSET)

        _last_used_at = d.pop("lastUsedAt", UNSET)
        last_used_at: datetime.datetime | Unset
        if isinstance(_last_used_at, Unset):
            last_used_at = UNSET
        else:
            last_used_at = isoparse(_last_used_at)

        _settings = d.pop("settings", UNSET)
        settings: AiCopilotProviderSettings | Unset
        if isinstance(_settings, Unset):
            settings = UNSET
        else:
            settings = AiCopilotProviderSettings.from_dict(_settings)

        ai_copilot_open_ai = cls(
            type_=type_,
            id=id,
            name=name,
            system_prompt=system_prompt,
            always_use_knowledge=always_use_knowledge,
            created_at=created_at,
            updated_at=updated_at,
            provider=provider,
            provider_model=provider_model,
            description=description,
            knowledge_prompt=knowledge_prompt,
            last_used_at=last_used_at,
            settings=settings,
        )

        return ai_copilot_open_ai
