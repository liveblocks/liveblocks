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
        "url": "/v2/rooms/{room_id}/storage/json-patch".format(
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
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
