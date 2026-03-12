from typing import Any

import httpx

from ... import errors
from ...models.create_management_project_request_body import CreateManagementProjectRequestBody
from ...models.management_project import ManagementProject


def _get_kwargs(
    *,
    body: CreateManagementProjectRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementProject:
    if response.status_code == 200:
        response_200 = ManagementProject.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateManagementProjectRequestBody,
) -> ManagementProject:
    kwargs = _get_kwargs(
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    body: CreateManagementProjectRequestBody,
) -> ManagementProject:
    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
