from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_knowledge_sources import GetKnowledgeSources
from ...types import UNSET, Response, Unset


def _get_kwargs(
    copilot_id: str,
    *,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/ai/copilots/{copilot_id}/knowledge".format(
            copilot_id=quote(str(copilot_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetKnowledgeSources | None:
    if response.status_code == 200:
        response_200 = GetKnowledgeSources.from_dict(response.json())

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
) -> Response[Error | GetKnowledgeSources]:
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
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Response[Error | GetKnowledgeSources]:
    """Get knowledge sources

     This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
    to [`liveblocks.getKnowledgeSources`](/docs/api-reference/liveblocks-node#get-knowledge-sources).

    Args:
        copilot_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetKnowledgeSources]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Error | GetKnowledgeSources | None:
    """Get knowledge sources

     This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
    to [`liveblocks.getKnowledgeSources`](/docs/api-reference/liveblocks-node#get-knowledge-sources).

    Args:
        copilot_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetKnowledgeSources
    """

    return sync_detailed(
        copilot_id=copilot_id,
        client=client,
        limit=limit,
        starting_after=starting_after,
    ).parsed


async def asyncio_detailed(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Response[Error | GetKnowledgeSources]:
    """Get knowledge sources

     This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
    to [`liveblocks.getKnowledgeSources`](/docs/api-reference/liveblocks-node#get-knowledge-sources).

    Args:
        copilot_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetKnowledgeSources]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Error | GetKnowledgeSources | None:
    """Get knowledge sources

     This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
    to [`liveblocks.getKnowledgeSources`](/docs/api-reference/liveblocks-node#get-knowledge-sources).

    Args:
        copilot_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetKnowledgeSources
    """

    return (
        await asyncio_detailed(
            copilot_id=copilot_id,
            client=client,
            limit=limit,
            starting_after=starting_after,
        )
    ).parsed
