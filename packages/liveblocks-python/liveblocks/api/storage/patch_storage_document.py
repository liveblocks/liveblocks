from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.add_json_patch_operation import AddJsonPatchOperation
from ...models.copy_json_patch_operation import CopyJsonPatchOperation
from ...models.move_json_patch_operation import MoveJsonPatchOperation
from ...models.remove_json_patch_operation import RemoveJsonPatchOperation
from ...models.replace_json_patch_operation import ReplaceJsonPatchOperation
from ...models.test_json_patch_operation import TestJsonPatchOperation


def _get_kwargs(
    room_id: str,
    *,
    body: list[
        AddJsonPatchOperation
        | CopyJsonPatchOperation
        | MoveJsonPatchOperation
        | RemoveJsonPatchOperation
        | ReplaceJsonPatchOperation
        | TestJsonPatchOperation
    ],
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/rooms/{room_id}/storage/json-patch".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    _kwargs["json"] = []
    for componentsschemas_patch_storage_document_request_body_item_data in body:
        componentsschemas_patch_storage_document_request_body_item: dict[str, Any]
        if isinstance(componentsschemas_patch_storage_document_request_body_item_data, AddJsonPatchOperation):
            componentsschemas_patch_storage_document_request_body_item = (
                componentsschemas_patch_storage_document_request_body_item_data.to_dict()
            )
        elif isinstance(componentsschemas_patch_storage_document_request_body_item_data, RemoveJsonPatchOperation):
            componentsschemas_patch_storage_document_request_body_item = (
                componentsschemas_patch_storage_document_request_body_item_data.to_dict()
            )
        elif isinstance(componentsschemas_patch_storage_document_request_body_item_data, ReplaceJsonPatchOperation):
            componentsschemas_patch_storage_document_request_body_item = (
                componentsschemas_patch_storage_document_request_body_item_data.to_dict()
            )
        elif isinstance(componentsschemas_patch_storage_document_request_body_item_data, CopyJsonPatchOperation):
            componentsschemas_patch_storage_document_request_body_item = (
                componentsschemas_patch_storage_document_request_body_item_data.to_dict()
            )
        elif isinstance(componentsschemas_patch_storage_document_request_body_item_data, MoveJsonPatchOperation):
            componentsschemas_patch_storage_document_request_body_item = (
                componentsschemas_patch_storage_document_request_body_item_data.to_dict()
            )
        else:
            componentsschemas_patch_storage_document_request_body_item = (
                componentsschemas_patch_storage_document_request_body_item_data.to_dict()
            )

        _kwargs["json"].append(componentsschemas_patch_storage_document_request_body_item)

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: list[
        AddJsonPatchOperation
        | CopyJsonPatchOperation
        | MoveJsonPatchOperation
        | RemoveJsonPatchOperation
        | ReplaceJsonPatchOperation
        | TestJsonPatchOperation
    ],
) -> None:
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
        body (list[AddJsonPatchOperation | CopyJsonPatchOperation | MoveJsonPatchOperation |
            RemoveJsonPatchOperation | ReplaceJsonPatchOperation | TestJsonPatchOperation]):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
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
    body: list[
        AddJsonPatchOperation
        | CopyJsonPatchOperation
        | MoveJsonPatchOperation
        | RemoveJsonPatchOperation
        | ReplaceJsonPatchOperation
        | TestJsonPatchOperation
    ],
) -> None:
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
        body (list[AddJsonPatchOperation | CopyJsonPatchOperation | MoveJsonPatchOperation |
            RemoveJsonPatchOperation | ReplaceJsonPatchOperation | TestJsonPatchOperation]):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
