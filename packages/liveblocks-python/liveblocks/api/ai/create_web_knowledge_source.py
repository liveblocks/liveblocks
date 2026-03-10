from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_web_knowledge_source_request_body import CreateWebKnowledgeSourceRequestBody
from ...models.create_web_knowledge_source_response import CreateWebKnowledgeSourceResponse


def _get_kwargs(
    copilot_id: str,
    *,
    body: CreateWebKnowledgeSourceRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/ai/copilots/{copilot_id}/knowledge/web".format(
            copilot_id=quote(str(copilot_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> CreateWebKnowledgeSourceResponse:
    if response.status_code == 200:
        response_200 = CreateWebKnowledgeSourceResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    *,
    client: httpx.Client,
    body: CreateWebKnowledgeSourceRequestBody,
) -> CreateWebKnowledgeSourceResponse:
    """Create web knowledge source

     This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
    and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](/docs/api-
    reference/liveblocks-node#create-web-knowledge-source).

    Args:
        copilot_id (str):
        body (CreateWebKnowledgeSourceRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateWebKnowledgeSourceResponse
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    copilot_id: str,
    *,
    client: httpx.AsyncClient,
    body: CreateWebKnowledgeSourceRequestBody,
) -> CreateWebKnowledgeSourceResponse:
    """Create web knowledge source

     This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
    and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](/docs/api-
    reference/liveblocks-node#create-web-knowledge-source).

    Args:
        copilot_id (str):
        body (CreateWebKnowledgeSourceRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateWebKnowledgeSourceResponse
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
