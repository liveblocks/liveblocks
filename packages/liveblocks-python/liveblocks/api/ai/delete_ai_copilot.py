from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    copilot_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/v2/ai/copilots/{copilot_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    *,
    client: httpx.Client,
) -> None:
    """Delete AI copilot

     This endpoint deletes an AI copilot by its ID. A deleted copilot is no longer accessible and cannot
    be restored. Corresponds to [`liveblocks.deleteAiCopilot`](/docs/api-reference/liveblocks-
    node#delete-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
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
) -> None:
    """Delete AI copilot

     This endpoint deletes an AI copilot by its ID. A deleted copilot is no longer accessible and cannot
    be restored. Corresponds to [`liveblocks.deleteAiCopilot`](/docs/api-reference/liveblocks-
    node#delete-ai-copilot).

    Args:
        copilot_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
