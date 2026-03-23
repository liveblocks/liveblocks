from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.ai_copilot_anthropic import AiCopilotAnthropic
from ...models.ai_copilot_google import AiCopilotGoogle
from ...models.ai_copilot_open_ai import AiCopilotOpenAi
from ...models.ai_copilot_open_ai_compatible import AiCopilotOpenAiCompatible
from ...models.update_ai_copilot_request_body import UpdateAiCopilotRequestBody


def _get_kwargs(
    copilot_id: str,
    *,
    body: UpdateAiCopilotRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/ai/copilots/{copilot_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, response: httpx.Response
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    if response.status_code == 200:

        def _parse_response_200(
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

        response_200 = _parse_response_200(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    *,
    client: httpx.Client,
    body: UpdateAiCopilotRequestBody,
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    copilot_id: str,
    *,
    client: httpx.AsyncClient,
    body: UpdateAiCopilotRequestBody,
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
