from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.management_project_response import ManagementProjectResponse
from ...models.update_management_project import UpdateManagementProject
from ...types import UNSET, Response, Unset


def _get_kwargs(
    project_id: str,
    *,
    body: UpdateManagementProject | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}".format(
            project_id=quote(str(project_id), safe=""),
        ),
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

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

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
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateManagementProject | Unset = UNSET,
) -> Response[Error | ManagementProjectResponse]:
    """Update project

     Updates an existing project specified by its ID. This endpoint allows you to modify project details
    such as the project name and the version creation timeout. The `versionCreationTimeout` can be set
    to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from
    the request body will not be updated. Requires the `write:all` scope.

    If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (UpdateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateManagementProject | Unset = UNSET,
) -> Error | ManagementProjectResponse | None:
    """Update project

     Updates an existing project specified by its ID. This endpoint allows you to modify project details
    such as the project name and the version creation timeout. The `versionCreationTimeout` can be set
    to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from
    the request body will not be updated. Requires the `write:all` scope.

    If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (UpdateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectResponse
    """

    return sync_detailed(
        project_id=project_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateManagementProject | Unset = UNSET,
) -> Response[Error | ManagementProjectResponse]:
    """Update project

     Updates an existing project specified by its ID. This endpoint allows you to modify project details
    such as the project name and the version creation timeout. The `versionCreationTimeout` can be set
    to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from
    the request body will not be updated. Requires the `write:all` scope.

    If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (UpdateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateManagementProject | Unset = UNSET,
) -> Error | ManagementProjectResponse | None:
    """Update project

     Updates an existing project specified by its ID. This endpoint allows you to modify project details
    such as the project name and the version creation timeout. The `versionCreationTimeout` can be set
    to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from
    the request body will not be updated. Requires the `write:all` scope.

    If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (UpdateManagementProject | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectResponse
    """

    return (
        await asyncio_detailed(
            project_id=project_id,
            client=client,
            body=body,
        )
    ).parsed
