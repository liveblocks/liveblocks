from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.add_group_members_request_body import AddGroupMembersRequestBody
from ...models.group import Group


def _get_kwargs(
    group_id: str,
    *,
    body: AddGroupMembersRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/groups/{group_id}/add-members".format(
            group_id=quote(str(group_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Group:
    if response.status_code == 200:
        response_200 = Group.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    group_id: str,
    *,
    client: httpx.Client,
    body: AddGroupMembersRequestBody,
) -> Group:
    kwargs = _get_kwargs(
        group_id=group_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    group_id: str,
    *,
    client: httpx.AsyncClient,
    body: AddGroupMembersRequestBody,
) -> Group:
    kwargs = _get_kwargs(
        group_id=group_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
