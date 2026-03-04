from typing import Any

import httpx

from ... import errors
from ...models.ai_copilot_anthropic import AiCopilotAnthropic
from ...models.ai_copilot_google import AiCopilotGoogle
from ...models.ai_copilot_open_ai import AiCopilotOpenAi
from ...models.ai_copilot_open_ai_compatible import AiCopilotOpenAiCompatible
from ...models.create_ai_copilot_options_anthropic import CreateAiCopilotOptionsAnthropic
from ...models.create_ai_copilot_options_google import CreateAiCopilotOptionsGoogle
from ...models.create_ai_copilot_options_open_ai import CreateAiCopilotOptionsOpenAi
from ...models.create_ai_copilot_options_open_ai_compatible import CreateAiCopilotOptionsOpenAiCompatible


def _get_kwargs(
    *,
    body: CreateAiCopilotOptionsAnthropic
    | CreateAiCopilotOptionsGoogle
    | CreateAiCopilotOptionsOpenAi
    | CreateAiCopilotOptionsOpenAiCompatible,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/ai/copilots",
    }

    if isinstance(body, CreateAiCopilotOptionsOpenAi):
        _kwargs["json"] = body.to_dict()
    elif isinstance(body, CreateAiCopilotOptionsAnthropic):
        _kwargs["json"] = body.to_dict()
    elif isinstance(body, CreateAiCopilotOptionsGoogle):
        _kwargs["json"] = body.to_dict()
    else:
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, response: httpx.Response
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    if response.status_code == 201:

        def _parse_response_201(
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

        response_201 = _parse_response_201(response.json())

        return response_201

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateAiCopilotOptionsAnthropic
    | CreateAiCopilotOptionsGoogle
    | CreateAiCopilotOptionsOpenAi
    | CreateAiCopilotOptionsOpenAiCompatible,
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    """Create AI copilot

     This endpoint creates a new AI copilot with the given configuration. Corresponds to
    [`liveblocks.createAiCopilot`](/docs/api-reference/liveblocks-node#create-ai-copilot).

    Args:
        body (CreateAiCopilotOptionsAnthropic | CreateAiCopilotOptionsGoogle |
            CreateAiCopilotOptionsOpenAi | CreateAiCopilotOptionsOpenAiCompatible):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    body: CreateAiCopilotOptionsAnthropic
    | CreateAiCopilotOptionsGoogle
    | CreateAiCopilotOptionsOpenAi
    | CreateAiCopilotOptionsOpenAiCompatible,
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    """Create AI copilot

     This endpoint creates a new AI copilot with the given configuration. Corresponds to
    [`liveblocks.createAiCopilot`](/docs/api-reference/liveblocks-node#create-ai-copilot).

    Args:
        body (CreateAiCopilotOptionsAnthropic | CreateAiCopilotOptionsGoogle |
            CreateAiCopilotOptionsOpenAi | CreateAiCopilotOptionsOpenAiCompatible):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
