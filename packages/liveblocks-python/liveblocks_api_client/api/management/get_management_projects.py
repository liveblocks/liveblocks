from typing import Any

import httpx

from ... import errors
from ...models.management_projects_response import ManagementProjectsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["cursor"] = cursor

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/management/projects",
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementProjectsResponse:
    if response.status_code == 200:
        response_200 = ManagementProjectsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> ManagementProjectsResponse:
    """List projects

     Returns a paginated list of projects. You can limit the number of projects returned per page and use
    the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

    Args:
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementProjectsResponse
    """

    kwargs = _get_kwargs(
        limit=limit,
        cursor=cursor,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> ManagementProjectsResponse:
    """List projects

     Returns a paginated list of projects. You can limit the number of projects returned per page and use
    the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

    Args:
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementProjectsResponse
    """

    kwargs = _get_kwargs(
        limit=limit,
        cursor=cursor,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
