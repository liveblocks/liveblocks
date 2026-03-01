from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...types import UNSET, Unset


def _get_kwargs(
    copilot_id: str,
    knowledge_source_id: str,
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
        "url": "/ai/copilots/{copilot_id}/knowledge/web/{knowledge_source_id}/links".format(
            copilot_id=quote(str(copilot_id), safe=""),
            knowledge_source_id=quote(str(knowledge_source_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> None:
    """Get web knowledge source links

     This endpoint returns a paginated list of links that were indexed from a web knowledge source. This
    is useful for understanding what content the AI copilot has access to from web sources. Corresponds
    to [`liveblocks.getWebKnowledgeSourceLinks`](/docs/api-reference/liveblocks-node#get-web-knowledge-
    source-links).

    Args:
        copilot_id (str):
        knowledge_source_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.AsyncClient,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> None:
    """Get web knowledge source links

     This endpoint returns a paginated list of links that were indexed from a web knowledge source. This
    is useful for understanding what content the AI copilot has access to from web sources. Corresponds
    to [`liveblocks.getWebKnowledgeSourceLinks`](/docs/api-reference/liveblocks-node#get-web-knowledge-
    source-links).

    Args:
        copilot_id (str):
        knowledge_source_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return None
