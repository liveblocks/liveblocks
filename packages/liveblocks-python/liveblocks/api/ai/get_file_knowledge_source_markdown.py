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
    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
