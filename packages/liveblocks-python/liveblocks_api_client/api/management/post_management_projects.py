from typing import Any

import httpx

from ... import errors
from ...models.create_management_project import CreateManagementProject
from ...models.management_project_response import ManagementProjectResponse
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    body: CreateManagementProject | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementProjectResponse:
    if response.status_code == 200:
        response_200 = ManagementProjectResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateManagementProject | Unset = UNSET,
) -> ManagementProjectResponse:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProject | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementProjectResponse
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
    body: CreateManagementProject | Unset = UNSET,
) -> ManagementProjectResponse:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProject | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementProjectResponse
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
