from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.ai_copilot_anthropic import AiCopilotAnthropic
    from ..models.ai_copilot_google import AiCopilotGoogle
    from ..models.ai_copilot_open_ai import AiCopilotOpenAi
    from ..models.ai_copilot_open_ai_compatible import AiCopilotOpenAiCompatible


@_attrs_define
class GetAiCopilotsResponse:
    """
    Example:
        {'nextCursor': None, 'data': [{'type': 'copilot', 'id': 'cp_abc123', 'name': 'My Copilot', 'systemPrompt': 'You
            are a helpful assistant.', 'alwaysUseKnowledge': True, 'createdAt': '2024-06-01T12:00:00.000Z', 'updatedAt':
            '2024-06-01T12:00:00.000Z', 'provider': 'openai', 'providerModel': 'gpt-4o'}]}

    Attributes:
        next_cursor (None | str):
        data (list[AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible]):
    """

    next_cursor: None | str
    data: list[AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible]

    def to_dict(self) -> dict[str, Any]:
        from ..models.ai_copilot_anthropic import AiCopilotAnthropic
        from ..models.ai_copilot_google import AiCopilotGoogle
        from ..models.ai_copilot_open_ai import AiCopilotOpenAi

        next_cursor: None | str
        next_cursor = self.next_cursor

        data = []
        for data_item_data in self.data:
            data_item: dict[str, Any]
            if isinstance(data_item_data, AiCopilotOpenAi):
                data_item = data_item_data.to_dict()
            elif isinstance(data_item_data, AiCopilotAnthropic):
                data_item = data_item_data.to_dict()
            elif isinstance(data_item_data, AiCopilotGoogle):
                data_item = data_item_data.to_dict()
            else:
                data_item = data_item_data.to_dict()

            data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "nextCursor": next_cursor,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.ai_copilot_anthropic import AiCopilotAnthropic
        from ..models.ai_copilot_google import AiCopilotGoogle
        from ..models.ai_copilot_open_ai import AiCopilotOpenAi
        from ..models.ai_copilot_open_ai_compatible import AiCopilotOpenAiCompatible

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:

            def _parse_data_item(
                data: object,
            ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_ai_copilot_type_0 = AiCopilotOpenAi.from_dict(data)

                    return componentsschemas_ai_copilot_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_ai_copilot_type_1 = AiCopilotAnthropic.from_dict(data)

                    return componentsschemas_ai_copilot_type_1
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_ai_copilot_type_2 = AiCopilotGoogle.from_dict(data)

                    return componentsschemas_ai_copilot_type_2
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_ai_copilot_type_3 = AiCopilotOpenAiCompatible.from_dict(data)

                return componentsschemas_ai_copilot_type_3

            data_item = _parse_data_item(data_item_data)

            data.append(data_item)

        get_ai_copilots_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_ai_copilots_response
