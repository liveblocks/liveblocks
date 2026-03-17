from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.roll_project_public_api_key_request_body import RollProjectPublicApiKeyRequestBody
from ...models.roll_project_public_api_key_response import RollProjectPublicApiKeyResponse
from ...types import UNSET, Unset


def _get_kwargs(
    project_id: str,
    *,
    body: RollProjectPublicApiKeyRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects/{project_id}/api-keys/public/roll".format(
            project_id=quote(str(project_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> RollProjectPublicApiKeyResponse:
    if response.status_code == 200:
        response_200 = RollProjectPublicApiKeyResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    *,
    client: httpx.Client,
    body: RollProjectPublicApiKeyRequestBody | Unset = UNSET,
) -> RollProjectPublicApiKeyResponse:
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
    body: RollProjectPublicApiKeyRequestBody | Unset = UNSET,
) -> RollProjectPublicApiKeyResponse:
    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
