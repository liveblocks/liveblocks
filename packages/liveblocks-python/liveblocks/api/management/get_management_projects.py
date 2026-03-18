from typing import Any

import httpx

from ... import errors
from ...models.get_management_projects_response import GetManagementProjectsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 20,
    cursor: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["cursor"] = cursor

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/management/projects",
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetManagementProjectsResponse:
    if response.status_code == 200:
        response_200 = GetManagementProjectsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    limit: int | Unset = 20,
    cursor: str | Unset = UNSET,
) -> GetManagementProjectsResponse:
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
    limit: int | Unset = 20,
    cursor: str | Unset = UNSET,
) -> GetManagementProjectsResponse:
    kwargs = _get_kwargs(
        limit=limit,
        cursor=cursor,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
