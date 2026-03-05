from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.management_project_roll_project_secret_api_key_response_secret_key_response import (
    ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse,
)
from ...models.roll_project_secret_api_key_request_body import RollProjectSecretApiKeyRequestBody
from ...types import UNSET, Unset


def _get_kwargs(
    project_id: str,
    *,
    body: RollProjectSecretApiKeyRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/api-keys/secret/roll".format(
            project_id=quote(str(project_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse:
    if response.status_code == 200:
        response_200 = ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    *,
    client: httpx.Client,
    body: RollProjectSecretApiKeyRequestBody | Unset = UNSET,
) -> ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse:
    """Roll secret key

     Rolls (rotates) the secret API key associated with the specified project, generating a new key value
    while deprecating the previous one. The new key becomes immediately active. This endpoint requires
    the `write:all` scope.

    If the project cannot be found, a 404 error response is returned. An optional `expirationIn`
    parameter can be provided in the request body to set when the previous key should expire.

    Args:
        project_id (str):
        body (RollProjectSecretApiKeyRequestBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    project_id: str,
    *,
    client: httpx.AsyncClient,
    body: RollProjectSecretApiKeyRequestBody | Unset = UNSET,
) -> ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse:
    """Roll secret key

     Rolls (rotates) the secret API key associated with the specified project, generating a new key value
    while deprecating the previous one. The new key becomes immediately active. This endpoint requires
    the `write:all` scope.

    If the project cannot be found, a 404 error response is returned. An optional `expirationIn`
    parameter can be provided in the request body to set when the previous key should expire.

    Args:
        project_id (str):
        body (RollProjectSecretApiKeyRequestBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
