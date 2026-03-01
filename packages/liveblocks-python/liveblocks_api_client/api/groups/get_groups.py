from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_groups import GetGroups
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/groups",
        "params": params,
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | GetGroups | None:
    if response.status_code == 200:
        response_200 = GetGroups.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = cast(Any, None)
        return response_401

    if response.status_code == 403:
        response_403 = cast(Any, None)
        return response_403

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | GetGroups]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Response[Any | GetGroups]:
    """Get groups

     This endpoint returns a list of all groups in your project. Corresponds to
    [`liveblocks.getGroups`](/docs/api-reference/liveblocks-node#get-groups).

    Args:
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | GetGroups]
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Any | GetGroups | None:
    """Get groups

     This endpoint returns a list of all groups in your project. Corresponds to
    [`liveblocks.getGroups`](/docs/api-reference/liveblocks-node#get-groups).

    Args:
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | GetGroups
    """

    return sync_detailed(
        client=client,
        limit=limit,
        starting_after=starting_after,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Response[Any | GetGroups]:
    """Get groups

     This endpoint returns a list of all groups in your project. Corresponds to
    [`liveblocks.getGroups`](/docs/api-reference/liveblocks-node#get-groups).

    Args:
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | GetGroups]
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Any | GetGroups | None:
    """Get groups

     This endpoint returns a list of all groups in your project. Corresponds to
    [`liveblocks.getGroups`](/docs/api-reference/liveblocks-node#get-groups).

    Args:
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | GetGroups
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            starting_after=starting_after,
        )
    ).parsed
