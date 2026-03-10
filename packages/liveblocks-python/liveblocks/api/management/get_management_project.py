from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_management_project_response import GetManagementProjectResponse


def _get_kwargs(
    project_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/management/projects/{project_id}".format(
            project_id=quote(str(project_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetManagementProjectResponse:
    if response.status_code == 200:
        response_200 = GetManagementProjectResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    *,
    client: httpx.Client,
) -> GetManagementProjectResponse:
    kwargs = _get_kwargs(
        project_id=project_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    project_id: str,
    *,
    client: httpx.AsyncClient,
) -> GetManagementProjectResponse:
    kwargs = _get_kwargs(
        project_id=project_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
