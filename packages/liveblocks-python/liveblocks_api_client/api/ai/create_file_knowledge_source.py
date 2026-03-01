from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.create_file_knowledge_source_response_200 import CreateFileKnowledgeSourceResponse200
from ...models.error import Error
from ...types import UNSET, File, Response, Unset


def _get_kwargs(
    copilot_id: str,
    name: str,
    *,
    body: File | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/ai/copilots/{copilot_id}/knowledge/file/{name}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            name=quote(str(name), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["content"] = body.payload

    headers["Content-Type"] = "application/octet-stream"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CreateFileKnowledgeSourceResponse200 | Error | None:
    if response.status_code == 200:
        response_200 = CreateFileKnowledgeSourceResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[CreateFileKnowledgeSourceResponse200 | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    copilot_id: str,
    name: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
) -> Response[CreateFileKnowledgeSourceResponse200 | Error]:
    """Create file knowledge source

     This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
    then reference the content of the file when responding. Corresponds to
    [`liveblocks.createFileKnowledgeSource`](/docs/api-reference/liveblocks-node#create-file-knowledge-
    source).

    Args:
        copilot_id (str):
        name (str):
        body (File | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CreateFileKnowledgeSourceResponse200 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        name=name,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    copilot_id: str,
    name: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
) -> CreateFileKnowledgeSourceResponse200 | Error | None:
    """Create file knowledge source

     This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
    then reference the content of the file when responding. Corresponds to
    [`liveblocks.createFileKnowledgeSource`](/docs/api-reference/liveblocks-node#create-file-knowledge-
    source).

    Args:
        copilot_id (str):
        name (str):
        body (File | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateFileKnowledgeSourceResponse200 | Error
    """

    return sync_detailed(
        copilot_id=copilot_id,
        name=name,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    copilot_id: str,
    name: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
) -> Response[CreateFileKnowledgeSourceResponse200 | Error]:
    """Create file knowledge source

     This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
    then reference the content of the file when responding. Corresponds to
    [`liveblocks.createFileKnowledgeSource`](/docs/api-reference/liveblocks-node#create-file-knowledge-
    source).

    Args:
        copilot_id (str):
        name (str):
        body (File | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CreateFileKnowledgeSourceResponse200 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        name=name,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    copilot_id: str,
    name: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
) -> CreateFileKnowledgeSourceResponse200 | Error | None:
    """Create file knowledge source

     This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
    then reference the content of the file when responding. Corresponds to
    [`liveblocks.createFileKnowledgeSource`](/docs/api-reference/liveblocks-node#create-file-knowledge-
    source).

    Args:
        copilot_id (str):
        name (str):
        body (File | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateFileKnowledgeSourceResponse200 | Error
    """

    return (
        await asyncio_detailed(
            copilot_id=copilot_id,
            name=name,
            client=client,
            body=body,
        )
    ).parsed
