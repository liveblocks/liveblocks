from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, Self, cast

from attrs import define as _attrs_define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ai_copilot_provider_settings import AiCopilotProviderSettings


@_attrs_define
class AiCopilotBase:
    """
    Example:
        {'type': 'copilot', 'id': 'cp_abc123', 'name': 'My Copilot', 'systemPrompt': 'You are a helpful assistant.',
            'alwaysUseKnowledge': True, 'createdAt': '2024-06-01T12:00:00.000Z', 'updatedAt': '2024-06-01T12:00:00.000Z',
            'settings': {'maxTokens': 4096, 'temperature': 0.7}}

    Attributes:
        type_ (Literal['copilot']):
        id (str):
        name (str):
        system_prompt (str):
        always_use_knowledge (bool):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        description (str | Unset):
        knowledge_prompt (str | Unset):
        last_used_at (datetime.datetime | Unset):
        settings (AiCopilotProviderSettings | Unset):  Example: {'maxTokens': 4096, 'temperature': 0.7, 'topP': 0.9}.
    """

    type_: Literal["copilot"]
    id: str
    name: str
    system_prompt: str
    always_use_knowledge: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
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
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
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

        ai_copilot_base = cls(
            type_=type_,
            id=id,
            name=name,
            system_prompt=system_prompt,
            always_use_knowledge=always_use_knowledge,
            created_at=created_at,
            updated_at=updated_at,
            description=description,
            knowledge_prompt=knowledge_prompt,
            last_used_at=last_used_at,
            settings=settings,
        )

        return ai_copilot_base
