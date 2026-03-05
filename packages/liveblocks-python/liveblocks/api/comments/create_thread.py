from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_thread_request_body import CreateThreadRequestBody
from ...models.thread import Thread


def _get_kwargs(
    room_id: str,
    *,
    body: CreateThreadRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Thread:
    if response.status_code == 200:
        response_200 = Thread.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: CreateThreadRequestBody,
) -> Thread:
    r"""Create thread

     This endpoint creates a new thread and the first comment in the thread. Corresponds to
    [`liveblocks.createThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads).

    A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
    construct a comment’s body, which can be submitted under `comment.body`.

    ```json
    \"version\": 1,
    \"content\": [
      {
        \"type\": \"paragraph\",
        \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
      }
    ]
    ```

    Args:
        room_id (str):
        body (CreateThreadRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Thread
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
    body: CreateThreadRequestBody,
) -> Thread:
    r"""Create thread

     This endpoint creates a new thread and the first comment in the thread. Corresponds to
    [`liveblocks.createThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads).

    A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
    construct a comment’s body, which can be submitted under `comment.body`.

    ```json
    \"version\": 1,
    \"content\": [
      {
        \"type\": \"paragraph\",
        \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
      }
    ]
    ```

    Args:
        room_id (str):
        body (CreateThreadRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Thread
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
