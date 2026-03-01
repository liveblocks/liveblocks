from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.create_web_knowledge_source import CreateWebKnowledgeSource
from ...models.create_web_knowledge_source_response_200 import CreateWebKnowledgeSourceResponse200
from ...models.error import Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    copilot_id: str,
    *,
    body: CreateWebKnowledgeSource | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/ai/copilots/{copilot_id}/knowledge/web".format(
            copilot_id=quote(str(copilot_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CreateWebKnowledgeSourceResponse200 | Error | None:
    if response.status_code == 200:
        response_200 = CreateWebKnowledgeSourceResponse200.from_dict(response.json())

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
) -> Response[CreateWebKnowledgeSourceResponse200 | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: CreateWebKnowledgeSource | Unset = UNSET,
) -> Response[CreateWebKnowledgeSourceResponse200 | Error]:
    """Create web knowledge source

     This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
    and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](/docs/api-
    reference/liveblocks-node#create-web-knowledge-source).

    Args:
        copilot_id (str):
        body (CreateWebKnowledgeSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CreateWebKnowledgeSourceResponse200 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: CreateWebKnowledgeSource | Unset = UNSET,
) -> CreateWebKnowledgeSourceResponse200 | Error | None:
    """Create web knowledge source

     This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
    and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](/docs/api-
    reference/liveblocks-node#create-web-knowledge-source).

    Args:
        copilot_id (str):
        body (CreateWebKnowledgeSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateWebKnowledgeSourceResponse200 | Error
    """

    return sync_detailed(
        copilot_id=copilot_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: CreateWebKnowledgeSource | Unset = UNSET,
) -> Response[CreateWebKnowledgeSourceResponse200 | Error]:
    """Create web knowledge source

     This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
    and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](/docs/api-
    reference/liveblocks-node#create-web-knowledge-source).

    Args:
        copilot_id (str):
        body (CreateWebKnowledgeSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CreateWebKnowledgeSourceResponse200 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: CreateWebKnowledgeSource | Unset = UNSET,
) -> CreateWebKnowledgeSourceResponse200 | Error | None:
    """Create web knowledge source

     This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
    and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](/docs/api-
    reference/liveblocks-node#create-web-knowledge-source).

    Args:
        copilot_id (str):
        body (CreateWebKnowledgeSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateWebKnowledgeSourceResponse200 | Error
    """

    return (
        await asyncio_detailed(
            copilot_id=copilot_id,
            client=client,
            body=body,
        )
    ).parsed
