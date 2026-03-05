from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_knowledge_sources_response import GetKnowledgeSourcesResponse
from ...types import UNSET, Unset


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


def _parse_response(*, response: httpx.Response) -> GetKnowledgeSourcesResponse:
    if response.status_code == 200:
        response_200 = GetKnowledgeSourcesResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    *,
    client: httpx.Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> GetKnowledgeSourcesResponse:
    """Get knowledge sources

     This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
    to [`liveblocks.getKnowledgeSources`](/docs/api-reference/liveblocks-node#get-knowledge-sources).

    Args:
        copilot_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetKnowledgeSourcesResponse
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    copilot_id: str,
    *,
    client: httpx.AsyncClient,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> GetKnowledgeSourcesResponse:
    """Get knowledge sources

     This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
    to [`liveblocks.getKnowledgeSources`](/docs/api-reference/liveblocks-node#get-knowledge-sources).

    Args:
        copilot_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetKnowledgeSourcesResponse
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
