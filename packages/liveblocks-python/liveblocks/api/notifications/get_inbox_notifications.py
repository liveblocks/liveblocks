from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_inbox_notifications_response import GetInboxNotificationsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    user_id: str,
    *,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: int | Unset = 50,
    starting_after: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["organizationId"] = organization_id

    params["query"] = query

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/users/{user_id}/inbox-notifications".format(
            user_id=quote(str(user_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetInboxNotificationsResponse:
    if response.status_code == 200:
        response_200 = GetInboxNotificationsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    *,
    client: httpx.Client,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: int | Unset = 50,
    starting_after: str | Unset = UNSET,
) -> GetInboxNotificationsResponse:
    kwargs = _get_kwargs(
        user_id=user_id,
        organization_id=organization_id,
        query=query,
        limit=limit,
        starting_after=starting_after,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    user_id: str,
    *,
    client: httpx.AsyncClient,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: int | Unset = 50,
    starting_after: str | Unset = UNSET,
) -> GetInboxNotificationsResponse:
    kwargs = _get_kwargs(
        user_id=user_id,
        organization_id=organization_id,
        query=query,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
