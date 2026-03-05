from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..models.google_model import GoogleModel
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings
    from ..models.google_provider_options import GoogleProviderOptions


T = TypeVar("T", bound="AiCopilotGoogle")


@_attrs_define
class AiCopilotGoogle:
    """
    Attributes:
        type_ (Literal['copilot']):
        id (str):
        name (str):
        system_prompt (str):
        always_use_knowledge (bool):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        provider (Literal['google']):
        provider_model (GoogleModel):
        description (str | Unset):
        knowledge_prompt (str | Unset):
        last_used_at (datetime.datetime | Unset):
        settings (AiCopilotProviderSettings | Unset):
        provider_options (GoogleProviderOptions | Unset):
    """

    type_: Literal["copilot"]
    id: str
    name: str
    system_prompt: str
    always_use_knowledge: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    provider: Literal["google"]
    provider_model: GoogleModel
    description: str | Unset = UNSET
    knowledge_prompt: str | Unset = UNSET
    last_used_at: datetime.datetime | Unset = UNSET
    settings: AiCopilotProviderSettings | Unset = UNSET
    provider_options: GoogleProviderOptions | Unset = UNSET

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

        provider_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.provider_options, Unset):
            provider_options = self.provider_options.to_dict()

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
        if provider_options is not UNSET:
            field_dict["providerOptions"] = provider_options

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings
        from ..models.google_provider_options import GoogleProviderOptions

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

        provider = cast(Literal["google"], d.pop("provider"))
        if provider != "google":
            raise ValueError(f"provider must match const 'google', got '{provider}'")

        provider_model = GoogleModel(d.pop("providerModel"))

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

        _provider_options = d.pop("providerOptions", UNSET)
        provider_options: GoogleProviderOptions | Unset
        if isinstance(_provider_options, Unset):
            provider_options = UNSET
        else:
            provider_options = GoogleProviderOptions.from_dict(_provider_options)

        ai_copilot_google = cls(
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
            provider_options=provider_options,
        )

        return ai_copilot_google
