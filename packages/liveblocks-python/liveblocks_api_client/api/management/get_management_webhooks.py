from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_management_webhooks_response import GetManagementWebhooksResponse
from ...types import UNSET, Unset


def _get_kwargs(
    project_id: str,
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
        "url": "/management/projects/{project_id}/webhooks".format(
            project_id=quote(str(project_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetManagementWebhooksResponse:
    if response.status_code == 200:
        response_200 = GetManagementWebhooksResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    *,
    client: httpx.Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> GetManagementWebhooksResponse:
    """List webhooks

     Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The
    response includes an array of webhook objects associated with the specified project, as well as a
    `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number
    of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter
    from the `nextCursor` value in the previous response to fetch subsequent pages. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetManagementWebhooksResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        limit=limit,
        cursor=cursor,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    project_id: str,
    *,
    client: httpx.AsyncClient,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> GetManagementWebhooksResponse:
    """List webhooks

     Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The
    response includes an array of webhook objects associated with the specified project, as well as a
    `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number
    of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter
    from the `nextCursor` value in the previous response to fetch subsequent pages. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetManagementWebhooksResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        limit=limit,
        cursor=cursor,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
