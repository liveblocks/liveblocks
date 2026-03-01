from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.file_knowledge_source import FileKnowledgeSource
from ...models.web_knowledge_source import WebKnowledgeSource


def _get_kwargs(
    copilot_id: str,
    knowledge_source_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/ai/copilots/{copilot_id}/knowledge/{knowledge_source_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            knowledge_source_id=quote(str(knowledge_source_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> FileKnowledgeSource | WebKnowledgeSource:
    if response.status_code == 200:

        def _parse_response_200(data: object) -> FileKnowledgeSource | WebKnowledgeSource:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_knowledge_source_web_knowledge_source = WebKnowledgeSource.from_dict(data)

                return componentsschemas_knowledge_source_web_knowledge_source
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            componentsschemas_knowledge_source_file_knowledge_source = FileKnowledgeSource.from_dict(data)

            return componentsschemas_knowledge_source_file_knowledge_source

        response_200 = _parse_response_200(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.Client,
) -> FileKnowledgeSource | WebKnowledgeSource:
    """Get knowledge source

     This endpoint returns a specific knowledge source by its ID. Corresponds to
    [`liveblocks.getKnowledgeSource`](/docs/api-reference/liveblocks-node#get-knowledge-source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        FileKnowledgeSource | WebKnowledgeSource
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
) -> FileKnowledgeSource | WebKnowledgeSource:
    """Get knowledge source

     This endpoint returns a specific knowledge source by its ID. Corresponds to
    [`liveblocks.getKnowledgeSource`](/docs/api-reference/liveblocks-node#get-knowledge-source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        FileKnowledgeSource | WebKnowledgeSource
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
