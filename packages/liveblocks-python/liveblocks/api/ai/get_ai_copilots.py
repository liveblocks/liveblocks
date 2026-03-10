from typing import Any

import httpx

from ... import errors
from ...models.get_ai_copilots_response import GetAiCopilotsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/ai/copilots",
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetAiCopilotsResponse:
    if response.status_code == 200:
        response_200 = GetAiCopilotsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
) -> GetAiCopilotsResponse:
    """Get AI copilots

     This endpoint returns a paginated list of AI copilots. The copilots are returned sorted by creation
    date, from newest to oldest. Corresponds to [`liveblocks.getAiCopilots`](/docs/api-
    reference/liveblocks-node#get-ai-copilots).

    Args:
        limit (int | Unset):  Default: 20.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetAiCopilotsResponse
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
) -> GetAiCopilotsResponse:
    """Get AI copilots

     This endpoint returns a paginated list of AI copilots. The copilots are returned sorted by creation
    date, from newest to oldest. Corresponds to [`liveblocks.getAiCopilots`](/docs/api-
    reference/liveblocks-node#get-ai-copilots).

    Args:
        limit (int | Unset):  Default: 20.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetAiCopilotsResponse
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
