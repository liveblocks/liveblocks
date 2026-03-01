from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_file_knowledge_source_content_response_200 import GetFileKnowledgeSourceContentResponse200
from ...types import Response


def _get_kwargs(
    copilot_id: str,
    knowledge_source_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/ai/copilots/{copilot_id}/knowledge/file/{knowledge_source_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            knowledge_source_id=quote(str(knowledge_source_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetFileKnowledgeSourceContentResponse200 | None:
    if response.status_code == 200:
        response_200 = GetFileKnowledgeSourceContentResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | GetFileKnowledgeSourceContentResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | GetFileKnowledgeSourceContentResponse200]:
    """Get file knowledge source content

     This endpoint returns the content of a file knowledge source as Markdown. This allows you to see
    what content the AI copilot has access to from uploaded files. Corresponds to
    [`liveblocks.getFileKnowledgeSourceMarkdown`](/docs/api-reference/liveblocks-node#get-file-
    knowledge-source-markdown).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetFileKnowledgeSourceContentResponse200]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | GetFileKnowledgeSourceContentResponse200 | None:
    """Get file knowledge source content

     This endpoint returns the content of a file knowledge source as Markdown. This allows you to see
    what content the AI copilot has access to from uploaded files. Corresponds to
    [`liveblocks.getFileKnowledgeSourceMarkdown`](/docs/api-reference/liveblocks-node#get-file-
    knowledge-source-markdown).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetFileKnowledgeSourceContentResponse200
    """

    return sync_detailed(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | GetFileKnowledgeSourceContentResponse200]:
    """Get file knowledge source content

     This endpoint returns the content of a file knowledge source as Markdown. This allows you to see
    what content the AI copilot has access to from uploaded files. Corresponds to
    [`liveblocks.getFileKnowledgeSourceMarkdown`](/docs/api-reference/liveblocks-node#get-file-
    knowledge-source-markdown).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetFileKnowledgeSourceContentResponse200]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | GetFileKnowledgeSourceContentResponse200 | None:
    """Get file knowledge source content

     This endpoint returns the content of a file knowledge source as Markdown. This allows you to see
    what content the AI copilot has access to from uploaded files. Corresponds to
    [`liveblocks.getFileKnowledgeSourceMarkdown`](/docs/api-reference/liveblocks-node#get-file-
    knowledge-source-markdown).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetFileKnowledgeSourceContentResponse200
    """

    return (
        await asyncio_detailed(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=client,
        )
    ).parsed
