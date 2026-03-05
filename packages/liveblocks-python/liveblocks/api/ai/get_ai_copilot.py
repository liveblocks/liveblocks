from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.ai_copilot_anthropic import AiCopilotAnthropic
from ...models.ai_copilot_google import AiCopilotGoogle
from ...models.ai_copilot_open_ai import AiCopilotOpenAi
from ...models.ai_copilot_open_ai_compatible import AiCopilotOpenAiCompatible


def _get_kwargs(
    copilot_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/ai/copilots/{copilot_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
        ),
    }

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
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    """Get AI copilot

     This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](/docs/api-
    reference/liveblocks-node#get-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    copilot_id: str,
    *,
    client: httpx.AsyncClient,
) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
    """Get AI copilot

     This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](/docs/api-
    reference/liveblocks-node#get-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
