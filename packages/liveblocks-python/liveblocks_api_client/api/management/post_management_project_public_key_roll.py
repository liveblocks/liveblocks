from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.management_project_key_roll_request import ManagementProjectKeyRollRequest
from ...models.management_project_public_key_response import ManagementProjectPublicKeyResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    project_id: str,
    *,
    body: ManagementProjectKeyRollRequest | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/api-keys/public/roll".format(
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
) -> Error | ManagementProjectPublicKeyResponse | None:
    if response.status_code == 200:
        response_200 = ManagementProjectPublicKeyResponse.from_dict(response.json())

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
) -> Response[Error | ManagementProjectPublicKeyResponse]:
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
    body: ManagementProjectKeyRollRequest | Unset = UNSET,
) -> Response[Error | ManagementProjectPublicKeyResponse]:
    """Roll public key

     Rolls (rotates) the public API key associated with the specified project, generating a new key value
    while deprecating the previous one. The new key becomes immediately active. This endpoint requires
    the `write:all` scope.

    If the public key is not currently enabled for the project, a 403 error response is returned. If the
    project cannot be found, a 404 error response is returned. An optional `expirationIn` parameter can
    be provided in the request body to set when the previous key should expire.

    Args:
        project_id (str):
        body (ManagementProjectKeyRollRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectPublicKeyResponse]
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
    body: ManagementProjectKeyRollRequest | Unset = UNSET,
) -> Error | ManagementProjectPublicKeyResponse | None:
    """Roll public key

     Rolls (rotates) the public API key associated with the specified project, generating a new key value
    while deprecating the previous one. The new key becomes immediately active. This endpoint requires
    the `write:all` scope.

    If the public key is not currently enabled for the project, a 403 error response is returned. If the
    project cannot be found, a 404 error response is returned. An optional `expirationIn` parameter can
    be provided in the request body to set when the previous key should expire.

    Args:
        project_id (str):
        body (ManagementProjectKeyRollRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectPublicKeyResponse
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
    body: ManagementProjectKeyRollRequest | Unset = UNSET,
) -> Response[Error | ManagementProjectPublicKeyResponse]:
    """Roll public key

     Rolls (rotates) the public API key associated with the specified project, generating a new key value
    while deprecating the previous one. The new key becomes immediately active. This endpoint requires
    the `write:all` scope.

    If the public key is not currently enabled for the project, a 403 error response is returned. If the
    project cannot be found, a 404 error response is returned. An optional `expirationIn` parameter can
    be provided in the request body to set when the previous key should expire.

    Args:
        project_id (str):
        body (ManagementProjectKeyRollRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectPublicKeyResponse]
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
    body: ManagementProjectKeyRollRequest | Unset = UNSET,
) -> Error | ManagementProjectPublicKeyResponse | None:
    """Roll public key

     Rolls (rotates) the public API key associated with the specified project, generating a new key value
    while deprecating the previous one. The new key becomes immediately active. This endpoint requires
    the `write:all` scope.

    If the public key is not currently enabled for the project, a 403 error response is returned. If the
    project cannot be found, a 404 error response is returned. An optional `expirationIn` parameter can
    be provided in the request body to set when the previous key should expire.

    Args:
        project_id (str):
        body (ManagementProjectKeyRollRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectPublicKeyResponse
    """

    return (
        await asyncio_detailed(
            project_id=project_id,
            client=client,
            body=body,
        )
    ).parsed
