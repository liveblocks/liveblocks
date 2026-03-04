from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_file_knowledge_source_response_200 import CreateFileKnowledgeSourceResponse200
from ...types import File


def _get_kwargs(
    copilot_id: str,
    name: str,
    *,
    body: File,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/ai/copilots/{copilot_id}/knowledge/file/{name}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            name=quote(str(name), safe=""),
        ),
    }

    _kwargs["content"] = body.payload

    headers["Content-Type"] = "application/octet-stream"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> CreateFileKnowledgeSourceResponse200:
    if response.status_code == 200:
        response_200 = CreateFileKnowledgeSourceResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    name: str,
    *,
    client: httpx.Client,
    body: File,
) -> CreateFileKnowledgeSourceResponse200:
    """Create file knowledge source

     This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
    then reference the content of the file when responding. Corresponds to
    [`liveblocks.createFileKnowledgeSource`](/docs/api-reference/liveblocks-node#create-file-knowledge-
    source).

    Args:
        copilot_id (str):
        name (str):
        body (File):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateFileKnowledgeSourceResponse200
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        name=name,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    copilot_id: str,
    name: str,
    *,
    client: httpx.AsyncClient,
    body: File,
) -> CreateFileKnowledgeSourceResponse200:
    """Create file knowledge source

     This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
    then reference the content of the file when responding. Corresponds to
    [`liveblocks.createFileKnowledgeSource`](/docs/api-reference/liveblocks-node#create-file-knowledge-
    source).

    Args:
        copilot_id (str):
        name (str):
        body (File):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateFileKnowledgeSourceResponse200
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        name=name,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
