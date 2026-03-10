from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_storage_document_format import GetStorageDocumentFormat
from ...models.get_storage_document_response import GetStorageDocumentResponse
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    format_: GetStorageDocumentFormat | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_format_: str | Unset = UNSET
    if not isinstance(format_, Unset):
        json_format_ = format_.value

    params["format"] = json_format_

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/storage".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetStorageDocumentResponse:
    if response.status_code == 200:
        response_200 = GetStorageDocumentResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    format_: GetStorageDocumentFormat | Unset = UNSET,
) -> GetStorageDocumentResponse:
    r"""Get Storage document

     Returns the contents of the room’s Storage tree.  Corresponds to
    [`liveblocks.getStorageDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-storage).

    The default outputted format is called “plain LSON”, which includes information on the Live data
    structures in the tree. These nodes show up in the output as objects with two properties, for
    example:

    ```json
    {
      \"liveblocksType\": \"LiveObject\",
      \"data\": ...
    }
    ```

    If you’re not interested in this information, you can use the simpler `?format=json` query param,
    see below.

    Args:
        room_id (str):
        format_ (GetStorageDocumentFormat | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetStorageDocumentResponse
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        format_=format_,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    format_: GetStorageDocumentFormat | Unset = UNSET,
) -> GetStorageDocumentResponse:
    r"""Get Storage document

     Returns the contents of the room’s Storage tree.  Corresponds to
    [`liveblocks.getStorageDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-storage).

    The default outputted format is called “plain LSON”, which includes information on the Live data
    structures in the tree. These nodes show up in the output as objects with two properties, for
    example:

    ```json
    {
      \"liveblocksType\": \"LiveObject\",
      \"data\": ...
    }
    ```

    If you’re not interested in this information, you can use the simpler `?format=json` query param,
    see below.

    Args:
        room_id (str):
        format_ (GetStorageDocumentFormat | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetStorageDocumentResponse
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        format_=format_,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
