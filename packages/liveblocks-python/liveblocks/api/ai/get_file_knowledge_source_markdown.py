from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_file_knowledge_source_markdown_response import GetFileKnowledgeSourceMarkdownResponse


def _get_kwargs(
    copilot_id: str,
    knowledge_source_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/ai/copilots/{copilot_id}/knowledge/file/{knowledge_source_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            knowledge_source_id=quote(str(knowledge_source_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetFileKnowledgeSourceMarkdownResponse:
    if response.status_code == 200:
        response_200 = GetFileKnowledgeSourceMarkdownResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.Client,
) -> GetFileKnowledgeSourceMarkdownResponse:
    """Get file knowledge source content

     This endpoint returns the content of a file knowledge source as markdown. This allows you to see
    what content the AI copilot has access to from uploaded files. Corresponds to
    [`liveblocks.getFileKnowledgeSourceMarkdown`](/docs/api-reference/liveblocks-node#get-file-
    knowledge-source-markdown).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetFileKnowledgeSourceMarkdownResponse
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.AsyncClient,
) -> GetFileKnowledgeSourceMarkdownResponse:
    """Get file knowledge source content

     This endpoint returns the content of a file knowledge source as markdown. This allows you to see
    what content the AI copilot has access to from uploaded files. Corresponds to
    [`liveblocks.getFileKnowledgeSourceMarkdown`](/docs/api-reference/liveblocks-node#get-file-
    knowledge-source-markdown).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetFileKnowledgeSourceMarkdownResponse
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
