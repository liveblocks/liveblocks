from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.update_management_project_request_body import UpdateManagementProjectRequestBody
from ...models.update_management_project_response import UpdateManagementProjectResponse


def _get_kwargs(
    project_id: str,
    *,
    body: UpdateManagementProjectRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects/{project_id}".format(
            project_id=quote(str(project_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> UpdateManagementProjectResponse:
    if response.status_code == 200:
        response_200 = UpdateManagementProjectResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    *,
    client: httpx.Client,
    body: UpdateManagementProjectRequestBody,
) -> UpdateManagementProjectResponse:
    """Update project

     Updates an existing project specified by its ID. This endpoint allows you to modify project details
    such as the project name and the version creation timeout. The `versionCreationTimeout` can be set
    to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from
    the request body will not be updated. Requires the `write:all` scope.

    If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (UpdateManagementProjectRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        UpdateManagementProjectResponse
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
    body: UpdateManagementProjectRequestBody,
) -> UpdateManagementProjectResponse:
    """Update project

     Updates an existing project specified by its ID. This endpoint allows you to modify project details
    such as the project name and the version creation timeout. The `versionCreationTimeout` can be set
    to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from
    the request body will not be updated. Requires the `write:all` scope.

    If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (UpdateManagementProjectRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        UpdateManagementProjectResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
