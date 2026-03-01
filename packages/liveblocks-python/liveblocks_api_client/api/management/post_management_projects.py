from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.create_management_project import CreateManagementProject
from ...models.error import Error
from ...models.management_project_response import ManagementProjectResponse
from ...types import UNSET, Response, Unset


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


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | ManagementProjectResponse | None:
    if response.status_code == 200:
        response_200 = ManagementProjectResponse.from_dict(response.json())

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
) -> Response[Error | ManagementProjectResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: CreateManagementProject | Unset = UNSET,
) -> Response[Error | ManagementProjectResponse]:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectResponse]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    body: CreateManagementProject | Unset = UNSET,
) -> Error | ManagementProjectResponse | None:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectResponse
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: CreateManagementProject | Unset = UNSET,
) -> Response[Error | ManagementProjectResponse]:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectResponse]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: CreateManagementProject | Unset = UNSET,
) -> Error | ManagementProjectResponse | None:
    """Create project

     Creates a new project within your account. This endpoint requires the `write:all` scope. You can
    specify the project type, name, and version creation timeout. Upon success, returns information
    about the newly created project, including its ID, keys, region, and settings.

    Args:
        body (CreateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
