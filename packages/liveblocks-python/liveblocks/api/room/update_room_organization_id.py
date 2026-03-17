from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.room import Room
from ...models.update_room_organization_id_request_body import UpdateRoomOrganizationIdRequestBody
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: UpdateRoomOrganizationIdRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/update-organization-id".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Room:
    if response.status_code == 200:
        response_200 = Room.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: UpdateRoomOrganizationIdRequestBody | Unset = UNSET,
) -> Room:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: UpdateRoomOrganizationIdRequestBody | Unset = UNSET,
) -> Room:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
