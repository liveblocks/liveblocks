from typing import Any

import httpx

from ... import errors
from ...models.create_management_project_request_body import CreateManagementProjectRequestBody
from ...models.create_management_project_response import CreateManagementProjectResponse


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


def _parse_response(*, response: httpx.Response) -> CreateManagementProjectResponse:
    if response.status_code == 200:
        response_200 = CreateManagementProjectResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateManagementProjectRequestBody,
) -> CreateManagementProjectResponse:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProjectRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateManagementProjectResponse
    """

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
) -> CreateManagementProjectResponse:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProjectRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateManagementProjectResponse
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
