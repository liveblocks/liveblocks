from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.ai_copilot_type_0 import AiCopilotType0
from ...models.ai_copilot_type_1 import AiCopilotType1
from ...models.ai_copilot_type_2 import AiCopilotType2
from ...models.ai_copilot_type_3 import AiCopilotType3
from ...models.error import Error
from ...types import Response


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
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error | None:
    if response.status_code == 200:

        def _parse_response_200(data: object) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
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

        response_200 = _parse_response_200(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]:
    """Get AI copilot

     This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](/docs/api-
    reference/liveblocks-node#get-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error | None:
    """Get AI copilot

     This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](/docs/api-
    reference/liveblocks-node#get-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error
    """

    return sync_detailed(
        copilot_id=copilot_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]:
    """Get AI copilot

     This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](/docs/api-
    reference/liveblocks-node#get-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error | None:
    """Get AI copilot

     This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](/docs/api-
    reference/liveblocks-node#get-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error
    """

    return (
        await asyncio_detailed(
            copilot_id=copilot_id,
            client=client,
        )
    ).parsed
