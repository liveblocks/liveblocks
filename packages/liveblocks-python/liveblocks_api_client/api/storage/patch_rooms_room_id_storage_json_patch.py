from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.patch_rooms_room_id_storage_json_patch_body_item import PatchRoomsRoomIdStorageJsonPatchBodyItem


def _get_kwargs(
    room_id: str,
    *,
    body: list[PatchRoomsRoomIdStorageJsonPatchBodyItem],
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/rooms/{room_id}/storage/json-patch".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    _kwargs["json"] = []
    for body_item_data in body:
        body_item = body_item_data.to_dict()
        _kwargs["json"].append(body_item)

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: list[PatchRoomsRoomIdStorageJsonPatchBodyItem],
) -> Any:
    """Apply JSON Patch to Storage

     Applies a sequence of [JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902) operations to the
    room's Storage document, useful for modifying Storage. Operations are applied in order; if any
    operation fails, the document is not changed and a 422 response with a helpful message is returned.

    **Paths and data types:** Be as specific as possible with your target path. Every parent in the
    chain of path segments must be a LiveObject, LiveList, or LiveMap. Complex nested objects passed in
    `add` or `replace` operations are automatically converted to LiveObjects and LiveLists.

    **Performance:** For large Storage documents, applying a patch can be expensive because the full
    state is reconstructed on the server to apply the operations. Very large documents may not be
    suitable for this endpoint.

    For a **full guide with examples**, see [Modifying storage via REST API with JSON
    Patch](/docs/guides/modifying-storage-via-rest-api-with-json-patch).

    Args:
        room_id (str):
        body (list[PatchRoomsRoomIdStorageJsonPatchBodyItem]):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: list[PatchRoomsRoomIdStorageJsonPatchBodyItem],
) -> Any:
    """Apply JSON Patch to Storage

     Applies a sequence of [JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902) operations to the
    room's Storage document, useful for modifying Storage. Operations are applied in order; if any
    operation fails, the document is not changed and a 422 response with a helpful message is returned.

    **Paths and data types:** Be as specific as possible with your target path. Every parent in the
    chain of path segments must be a LiveObject, LiveList, or LiveMap. Complex nested objects passed in
    `add` or `replace` operations are automatically converted to LiveObjects and LiveLists.

    **Performance:** For large Storage documents, applying a patch can be expensive because the full
    state is reconstructed on the server to apply the operations. Very large documents may not be
    suitable for this endpoint.

    For a **full guide with examples**, see [Modifying storage via REST API with JSON
    Patch](/docs/guides/modifying-storage-via-rest-api-with-json-patch).

    Args:
        room_id (str):
        body (list[PatchRoomsRoomIdStorageJsonPatchBodyItem]):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return None
