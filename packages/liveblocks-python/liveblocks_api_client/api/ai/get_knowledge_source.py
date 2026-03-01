from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.file_knowledge_source import FileKnowledgeSource
from ...models.web_knowledge_source import WebKnowledgeSource
from ...types import Response


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


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | FileKnowledgeSource | WebKnowledgeSource | None:
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
) -> Response[Error | FileKnowledgeSource | WebKnowledgeSource]:
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
) -> Response[Error | FileKnowledgeSource | WebKnowledgeSource]:
    """Get knowledge source

     This endpoint returns a specific knowledge source by its ID. Corresponds to
    [`liveblocks.getKnowledgeSource`](/docs/api-reference/liveblocks-node#get-knowledge-source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FileKnowledgeSource | WebKnowledgeSource]
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
) -> Error | FileKnowledgeSource | WebKnowledgeSource | None:
    """Get knowledge source

     This endpoint returns a specific knowledge source by its ID. Corresponds to
    [`liveblocks.getKnowledgeSource`](/docs/api-reference/liveblocks-node#get-knowledge-source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FileKnowledgeSource | WebKnowledgeSource
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
) -> Response[Error | FileKnowledgeSource | WebKnowledgeSource]:
    """Get knowledge source

     This endpoint returns a specific knowledge source by its ID. Corresponds to
    [`liveblocks.getKnowledgeSource`](/docs/api-reference/liveblocks-node#get-knowledge-source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FileKnowledgeSource | WebKnowledgeSource]
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
) -> Error | FileKnowledgeSource | WebKnowledgeSource | None:
    """Get knowledge source

     This endpoint returns a specific knowledge source by its ID. Corresponds to
    [`liveblocks.getKnowledgeSource`](/docs/api-reference/liveblocks-node#get-knowledge-source).

    Args:
        copilot_id (str):
        knowledge_source_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FileKnowledgeSource | WebKnowledgeSource
    """

    return (
        await asyncio_detailed(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=client,
        )
    ).parsed
