from typing import Any

import httpx

from ... import errors
from ...models.ai_copilot_type_0 import AiCopilotType0
from ...models.ai_copilot_type_1 import AiCopilotType1
from ...models.ai_copilot_type_2 import AiCopilotType2
from ...models.ai_copilot_type_3 import AiCopilotType3
from ...models.create_ai_copilot import CreateAiCopilot
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    body: CreateAiCopilot | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/ai/copilots",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
    if response.status_code == 201:

        def _parse_response_201(data: object) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_ai_copilot_type_0 = AiCopilotType0.from_dict(data)

                return componentsschemas_ai_copilot_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_ai_copilot_type_1 = AiCopilotType1.from_dict(data)

                return componentsschemas_ai_copilot_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_ai_copilot_type_2 = AiCopilotType2.from_dict(data)

                return componentsschemas_ai_copilot_type_2
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            componentsschemas_ai_copilot_type_3 = AiCopilotType3.from_dict(data)

            return componentsschemas_ai_copilot_type_3

        response_201 = _parse_response_201(response.json())

        return response_201

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateAiCopilot | Unset = UNSET,
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
    """Create AI copilot

     This endpoint creates a new AI copilot with the given configuration. Corresponds to
    [`liveblocks.createAiCopilot`](/docs/api-reference/liveblocks-node#create-ai-copilot).

    Args:
        body (CreateAiCopilot | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3
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
    body: CreateAiCopilot | Unset = UNSET,
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
    """Create AI copilot

     This endpoint creates a new AI copilot with the given configuration. Corresponds to
    [`liveblocks.createAiCopilot`](/docs/api-reference/liveblocks-node#create-ai-copilot).

    Args:
        body (CreateAiCopilot | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
