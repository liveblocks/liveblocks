from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    copilot_id: str,
    knowledge_source_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/ai/copilots/{copilot_id}/knowledge/file/{knowledge_source_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            knowledge_source_id=quote(str(knowledge_source_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.Client,
) -> Any:
    """Delete file knowledge source

     This endpoint deletes a file knowledge source from an AI copilot. The copilot will no longer have
    access to the content from this file. Corresponds to
    [`liveblocks.deleteFileKnowledgeSource`](/docs/api-reference/liveblocks-node#delete-file-knowledge-
    source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
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
) -> Any:
    """Delete file knowledge source

     This endpoint deletes a file knowledge source from an AI copilot. The copilot will no longer have
    access to the content from this file. Corresponds to
    [`liveblocks.deleteFileKnowledgeSource`](/docs/api-reference/liveblocks-node#delete-file-knowledge-
    source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = await client.request(
        **kwargs,
    )

    return None
