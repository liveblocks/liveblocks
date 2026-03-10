from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.knowledge_source_file_source import KnowledgeSourceFileSource
from ...models.knowledge_source_web_source import KnowledgeSourceWebSource


def _get_kwargs(
    copilot_id: str,
    knowledge_source_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/ai/copilots/{copilot_id}/knowledge/{knowledge_source_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            knowledge_source_id=quote(str(knowledge_source_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> KnowledgeSourceFileSource | KnowledgeSourceWebSource:
    if response.status_code == 200:

        def _parse_response_200(data: object) -> KnowledgeSourceFileSource | KnowledgeSourceWebSource:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_knowledge_source_type_0 = KnowledgeSourceWebSource.from_dict(data)

                return componentsschemas_knowledge_source_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            componentsschemas_knowledge_source_type_1 = KnowledgeSourceFileSource.from_dict(data)

            return componentsschemas_knowledge_source_type_1

        response_200 = _parse_response_200(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.Client,
) -> KnowledgeSourceFileSource | KnowledgeSourceWebSource:
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
        KnowledgeSourceFileSource | KnowledgeSourceWebSource
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
) -> KnowledgeSourceFileSource | KnowledgeSourceWebSource:
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
        KnowledgeSourceFileSource | KnowledgeSourceWebSource
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
