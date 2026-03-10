from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.initialize_storage_document_body import InitializeStorageDocumentBody
from ...models.initialize_storage_document_response import InitializeStorageDocumentResponse
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: InitializeStorageDocumentBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/storage".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> InitializeStorageDocumentResponse:
    if response.status_code == 200:
        response_200 = InitializeStorageDocumentResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: InitializeStorageDocumentBody | Unset = UNSET,
) -> InitializeStorageDocumentResponse:
    r"""Initialize Storage document

     This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling
    this endpoint will disconnect all users from the room if there are any, triggering a reconnect.
    Corresponds to [`liveblocks.initializeStorageDocument`](/docs/api-reference/liveblocks-node#post-
    rooms-roomId-storage).

    The format of the request body is the same as what’s returned by the get Storage endpoint.

    For each Liveblocks data structure that you want to create, you need a JSON element having two
    properties:
    - `\"liveblocksType\"` => `\"LiveObject\" | \"LiveList\" | \"LiveMap\"`
    - `\"data\"` => contains the nested data structures (children) and data.

    The root’s type can only be LiveObject.

    A utility function, `toPlainLson` is included in `@liveblocks/client` from `1.0.9` to help convert
    `LiveObject`, `LiveList`, and `LiveMap` to the structure expected by the endpoint.

    Args:
        room_id (str):
        body (InitializeStorageDocumentBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        InitializeStorageDocumentResponse
    """

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
    body: InitializeStorageDocumentBody | Unset = UNSET,
) -> InitializeStorageDocumentResponse:
    r"""Initialize Storage document

     This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling
    this endpoint will disconnect all users from the room if there are any, triggering a reconnect.
    Corresponds to [`liveblocks.initializeStorageDocument`](/docs/api-reference/liveblocks-node#post-
    rooms-roomId-storage).

    The format of the request body is the same as what’s returned by the get Storage endpoint.

    For each Liveblocks data structure that you want to create, you need a JSON element having two
    properties:
    - `\"liveblocksType\"` => `\"LiveObject\" | \"LiveList\" | \"LiveMap\"`
    - `\"data\"` => contains the nested data structures (children) and data.

    The root’s type can only be LiveObject.

    A utility function, `toPlainLson` is included in `@liveblocks/client` from `1.0.9` to help convert
    `LiveObject`, `LiveList`, and `LiveMap` to the structure expected by the endpoint.

    Args:
        room_id (str):
        body (InitializeStorageDocumentBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        InitializeStorageDocumentResponse
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
