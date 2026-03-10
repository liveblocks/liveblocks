# liveblocks

A client library for accessing Liveblocks API

## Installation

```bash
pip install liveblocks
```

## Quick Start

### Synchronous

```python
from liveblocks import Liveblocks

client = Liveblocks(secret="sk_your_secret_key")

with client:
    rooms = client.get_rooms()
    print(rooms)
```

### Asynchronous

```python
from liveblocks import AsyncLiveblocks

client = AsyncLiveblocks(secret="sk_your_secret_key")

async with client:
    rooms = await client.get_rooms()
    print(rooms)
```

## Authentication

All API calls require a **secret key** starting with `sk_`. You can find your secret key in the [Liveblocks Dashboard](https://liveblocks.io/dashboard/apikeys).

```python
client = Liveblocks(secret="sk_your_secret_key")
```

---

## API Reference

### room

#### `get_rooms`

**Get rooms**
This endpoint returns a list of your rooms. The rooms are returned sorted by creation date, from newest to oldest. You can filter rooms by room ID prefixes, metadata, users accesses, and groups accesses. Corresponds to [`liveblocks.getRooms`](/docs/api-reference/liveblocks-node#get-rooms).

- **HTTP:** `GET` `/rooms`
- **Returns:** `GetRoomsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `starting_after` | `str \| Unset` | No |  |
| `organization_id` | `str \| Unset` | No |  |
| `query` | `str \| Unset` | No |  |
| `user_id` | `str \| Unset` | No |  |
| `group_ids` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_rooms()
```

</details>

---

#### `create_room`

**Create room**
This endpoint creates a new room. `id` and `defaultAccesses` are required. When provided with a `?idempotent` query argument, will not return a 409 when the room already exists, but instead return the existing room as-is. Corresponds to [`liveblocks.createRoom`](/docs/api-reference/liveblocks-node#post-rooms), or to [`liveblocks.getOrCreateRoom`](/docs/api-reference/liveblocks-node#get-or-create-rooms-roomId) when `?idempotent` is provided. 

- **HTTP:** `POST` `/rooms`
- **Returns:** `Room`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `idempotent` | `bool \| Unset` | No |  |
| `body` | `CreateRoomRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_room(
    body=...,
)
```

</details>

---

#### `get_room`

**Get room**
This endpoint returns a room by its ID. Corresponds to [`liveblocks.getRoom`](/docs/api-reference/liveblocks-node#get-rooms-roomid).

- **HTTP:** `GET` `/rooms/{room_id}`
- **Returns:** `Room`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_room(
    room_id="...",
)
```

</details>

---

#### `update_room`

**Update room**
This endpoint updates specific properties of a room. Corresponds to [`liveblocks.updateRoom`](/docs/api-reference/liveblocks-node#post-rooms-roomid). 

- **HTTP:** `POST` `/rooms/{room_id}`
- **Returns:** `Room`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `UpdateRoomRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_room(
    room_id="...",
    body=...,
)
```

</details>

---

#### `delete_room`

**Delete room**
This endpoint deletes a room. A deleted room is no longer accessible from the API or the dashboard and it cannot be restored. Corresponds to [`liveblocks.deleteRoom`](/docs/api-reference/liveblocks-node#delete-rooms-roomid).

- **HTTP:** `DELETE` `/rooms/{room_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_room(
    room_id="...",
)
```

</details>

---

#### `prewarm_room`

**Prewarm room**
Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be connecting to a room with [`RoomProvider`](/docs/api-reference/liveblocks-react#RoomProvider) or [`enterRoom`](/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the room will load quicker.

- **HTTP:** `GET` `/rooms/{room_id}/prewarm`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.prewarm_room(
    room_id="...",
)
```

</details>

---

#### `upsert_room`

**Upsert (update or create) room**
This endpoint updates specific properties of a room. Corresponds to [`liveblocks.upsertRoom`](/docs/api-reference/liveblocks-node#upsert-rooms-roomId). 

- **HTTP:** `POST` `/rooms/{room_id}/upsert`
- **Returns:** `Room`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `UpsertRoomRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.upsert_room(
    room_id="...",
    body=...,
)
```

</details>

---

#### `update_room_id`

**Update room ID**
This endpoint permanently updates the room’s ID.

- **HTTP:** `POST` `/rooms/{room_id}/update-room-id`
- **Returns:** `Room`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `UpdateRoomIdRequestBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_room_id(
    room_id="...",
)
```

</details>

---

#### `get_active_users`

**Get active users**
This endpoint returns a list of users currently present in the requested room. Corresponds to [`liveblocks.getActiveUsers`](/docs/api-reference/liveblocks-node#get-rooms-roomid-active-users). 

- **HTTP:** `GET` `/rooms/{room_id}/active_users`
- **Returns:** `ActiveUsersResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_active_users(
    room_id="...",
)
```

</details>

---

#### `set_presence`

**Set ephemeral presence**
This endpoint sets ephemeral presence for a user in a room without requiring a WebSocket connection. The presence data will automatically expire after the specified TTL (time-to-live). This is useful for scenarios like showing an AI agent's presence in a room. The presence will be broadcast to all connected users in the room.

- **HTTP:** `POST` `/rooms/{room_id}/presence`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `SetPresenceRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.set_presence(
    room_id="...",
    body=...,
)
```

</details>

---

#### `broadcast_event`

**Broadcast event to a room**
This endpoint enables the broadcast of an event to a room without having to connect to it via the `client` from `@liveblocks/client`. It takes any valid JSON as a request body. The `connectionId` passed to event listeners is `-1` when using this API. Corresponds to [`liveblocks.broadcastEvent`](/docs/api-reference/liveblocks-node#post-broadcast-event).

- **HTTP:** `POST` `/rooms/{room_id}/broadcast_event`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `Any` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.broadcast_event(
    room_id="...",
    body=...,
)
```

</details>

---

### storage

#### `get_storage_document`

**Get Storage document**
Returns the contents of the room’s Storage tree.  Corresponds to [`liveblocks.getStorageDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-storage). 

- **HTTP:** `GET` `/rooms/{room_id}/storage`
- **Returns:** `GetStorageDocumentResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `format_` | `GetStorageDocumentFormat \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_storage_document(
    room_id="...",
)
```

</details>

---

#### `initialize_storage_document`

**Initialize Storage document**
This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling this endpoint will disconnect all users from the room if there are any, triggering a reconnect. Corresponds to [`liveblocks.initializeStorageDocument`](/docs/api-reference/liveblocks-node#post-rooms-roomId-storage).

- **HTTP:** `POST` `/rooms/{room_id}/storage`
- **Returns:** `InitializeStorageDocumentResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `InitializeStorageDocumentBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.initialize_storage_document(
    room_id="...",
)
```

</details>

---

#### `delete_storage_document`

**Delete Storage document**
This endpoint deletes all of the room’s Storage data. Calling this endpoint will disconnect all users from the room if there are any. Corresponds to [`liveblocks.deleteStorageDocument`](/docs/api-reference/liveblocks-node#delete-rooms-roomId-storage).

- **HTTP:** `DELETE` `/rooms/{room_id}/storage`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_storage_document(
    room_id="...",
)
```

</details>

---

#### `patch_storage_document`

**Apply JSON Patch to Storage**
Applies a sequence of [JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902) operations to the room's Storage document, useful for modifying Storage. Operations are applied in order; if any operation fails, the document is not changed and a 422 response with a helpful message is returned.

- **HTTP:** `PATCH` `/rooms/{room_id}/storage/json-patch`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `list[AddJsonPatchOperation \| CopyJsonPatchOperation \| MoveJsonPatchOperation \| RemoveJsonPatchOperation \| ReplaceJsonPatchOperation \| TestJsonPatchOperation]` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.patch_storage_document(
    room_id="...",
    body=...,
)
```

</details>

---

### yjs

#### `get_yjs_document`

**Get Yjs document**
This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to [`liveblocks.getYjsDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

- **HTTP:** `GET` `/rooms/{room_id}/ydoc`
- **Returns:** `GetYjsDocumentResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `formatting` | `bool \| Unset` | No |  |
| `key` | `str \| Unset` | No |  |
| `type_` | `GetYjsDocumentType \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_yjs_document(
    room_id="...",
)
```

</details>

---

#### `send_yjs_binary_update`

**Send a binary Yjs update**
This endpoint is used to send a Yjs binary update to the room’s Yjs document. You can use this endpoint to initialize Yjs data for the room or to update the room’s Yjs document. To send an update to a subdocument instead of the main document, pass its `guid`. Corresponds to [`liveblocks.sendYjsBinaryUpdate`](/docs/api-reference/liveblocks-node#put-rooms-roomId-ydoc).

- **HTTP:** `PUT` `/rooms/{room_id}/ydoc`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `guid` | `str \| Unset` | No |  |
| `body` | `File` | Yes | Request body (application/octet-stream) |

<details>
<summary>Example</summary>

```python
result = client.send_yjs_binary_update(
    room_id="...",
    body=...,
)
```

</details>

---

#### `get_yjs_document_as_binary_update`

**Get Yjs document encoded as a binary Yjs update**
This endpoint returns the room's Yjs document encoded as a single binary update. This can be used by `Y.applyUpdate(responseBody)` to get a copy of the document in your back end. See [Yjs documentation](https://docs.yjs.dev/api/document-updates) for more information on working with updates. To return a subdocument instead of the main document, pass its `guid`. Corresponds to [`liveblocks.getYjsDocumentAsBinaryUpdate`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc-binary).

- **HTTP:** `GET` `/rooms/{room_id}/ydoc-binary`
- **Returns:** `File`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `guid` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_yjs_document_as_binary_update(
    room_id="...",
)
```

</details>

---

#### `get_yjs_versions`

**Get Yjs version history**
This endpoint returns a list of version history snapshots for the room's Yjs document. The versions are returned sorted by creation date, from newest to oldest.

- **HTTP:** `GET` `/rooms/{room_id}/versions`
- **Returns:** `GetYjsVersionsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `cursor` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_yjs_versions(
    room_id="...",
)
```

</details>

---

#### `get_yjs_version`

**Get Yjs document version**
This endpoint returns a specific version of the room's Yjs document encoded as a binary Yjs update.

- **HTTP:** `GET` `/rooms/{room_id}/version/{version_id}`
- **Returns:** `File`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `version_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_yjs_version(
    room_id="...",
    version_id="...",
)
```

</details>

---

#### `create_yjs_version`

**Create Yjs version snapshot**
This endpoint creates a new version history snapshot for the room's Yjs document.

- **HTTP:** `POST` `/rooms/{room_id}/version`
- **Returns:** `CreateYjsVersionResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.create_yjs_version(
    room_id="...",
)
```

</details>

---

### comments

#### `get_threads`

**Get room threads**
This endpoint returns the threads in the requested room. Corresponds to [`liveblocks.getThreads`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads).

- **HTTP:** `GET` `/rooms/{room_id}/threads`
- **Returns:** `GetThreadsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `query` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_threads(
    room_id="...",
)
```

</details>

---

#### `create_thread`

**Create thread**
This endpoint creates a new thread and the first comment in the thread. Corresponds to [`liveblocks.createThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads).

- **HTTP:** `POST` `/rooms/{room_id}/threads`
- **Returns:** `Thread`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `body` | `CreateThreadRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_thread(
    room_id="...",
    body=...,
)
```

</details>

---

#### `get_thread`

**Get thread**
This endpoint returns a thread by its ID. Corresponds to [`liveblocks.getThread`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-threadId).

- **HTTP:** `GET` `/rooms/{room_id}/threads/{thread_id}`
- **Returns:** `Thread`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_thread(
    room_id="...",
    thread_id="...",
)
```

</details>

---

#### `delete_thread`

**Delete thread**
This endpoint deletes a thread by its ID. Corresponds to [`liveblocks.deleteThread`](/docs/api-reference/liveblocks-node#delete-rooms-roomId-threads-threadId).

- **HTTP:** `DELETE` `/rooms/{room_id}/threads/{thread_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_thread(
    room_id="...",
    thread_id="...",
)
```

</details>

---

#### `edit_thread_metadata`

**Edit thread metadata**
This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/metadata`
- **Returns:** `ThreadMetadata`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `body` | `UpdateThreadMetadataRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.edit_thread_metadata(
    room_id="...",
    thread_id="...",
    body=...,
)
```

</details>

---

#### `mark_thread_as_resolved`

**Mark thread as resolved**
This endpoint marks a thread as resolved.

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/mark-as-resolved`
- **Returns:** `Thread`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.mark_thread_as_resolved(
    room_id="...",
    thread_id="...",
)
```

</details>

---

#### `mark_thread_as_unresolved`

**Mark thread as unresolved**
This endpoint marks a thread as unresolved.

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/mark-as-unresolved`
- **Returns:** `Thread`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.mark_thread_as_unresolved(
    room_id="...",
    thread_id="...",
)
```

</details>

---

#### `subscribe_to_thread`

**Subscribe to thread**
This endpoint subscribes to a thread. Corresponds to [`liveblocks.subscribeToThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-subscribe).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/subscribe`
- **Returns:** `Subscription`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `body` | `SubscribeToThreadRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.subscribe_to_thread(
    room_id="...",
    thread_id="...",
    body=...,
)
```

</details>

---

#### `unsubscribe_from_thread`

**Unsubscribe from thread**
This endpoint unsubscribes from a thread. Corresponds to [`liveblocks.unsubscribeFromThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-unsubscribe).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/unsubscribe`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `body` | `UnsubscribeFromThreadRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.unsubscribe_from_thread(
    room_id="...",
    thread_id="...",
    body=...,
)
```

</details>

---

#### `get_thread_subscriptions`

**Get thread subscriptions**
This endpoint gets the list of subscriptions to a thread. Corresponds to [`liveblocks.getThreadSubscriptions`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-threadId-subscriptions).

- **HTTP:** `GET` `/rooms/{room_id}/threads/{thread_id}/subscriptions`
- **Returns:** `GetThreadSubscriptionsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_thread_subscriptions(
    room_id="...",
    thread_id="...",
)
```

</details>

---

#### `create_comment`

**Create comment**
This endpoint creates a new comment, adding it as a reply to a thread. Corresponds to [`liveblocks.createComment`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/comments`
- **Returns:** `Comment`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `body` | `CreateCommentRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_comment(
    room_id="...",
    thread_id="...",
    body=...,
)
```

</details>

---

#### `get_comment`

**Get comment**
This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

- **HTTP:** `GET` `/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}`
- **Returns:** `Comment`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `comment_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_comment(
    room_id="...",
    thread_id="...",
    comment_id="...",
)
```

</details>

---

#### `edit_comment`

**Edit comment**
This endpoint edits the specified comment. Corresponds to [`liveblocks.editComment`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}`
- **Returns:** `Comment`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `comment_id` | `str` | Yes |  |
| `body` | `EditCommentRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.edit_comment(
    room_id="...",
    thread_id="...",
    comment_id="...",
    body=...,
)
```

</details>

---

#### `delete_comment`

**Delete comment**
This endpoint deletes a comment. A deleted comment is no longer accessible from the API or the dashboard and it cannot be restored. Corresponds to [`liveblocks.deleteComment`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId).

- **HTTP:** `DELETE` `/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `comment_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_comment(
    room_id="...",
    thread_id="...",
    comment_id="...",
)
```

</details>

---

#### `add_comment_reaction`

**Add comment reaction**
This endpoint adds a reaction to a comment. Corresponds to [`liveblocks.addCommentReaction`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-add-reaction).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}/add-reaction`
- **Returns:** `CommentReaction`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `comment_id` | `str` | Yes |  |
| `body` | `AddCommentReactionRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.add_comment_reaction(
    room_id="...",
    thread_id="...",
    comment_id="...",
    body=...,
)
```

</details>

---

#### `remove_comment_reaction`

**Remove comment reaction**
This endpoint removes a comment reaction. A deleted comment reaction is no longer accessible from the API or the dashboard and it cannot be restored. Corresponds to [`liveblocks.removeCommentReaction`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-add-reaction).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}/remove-reaction`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `comment_id` | `str` | Yes |  |
| `body` | `RemoveCommentReactionRequestBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.remove_comment_reaction(
    room_id="...",
    thread_id="...",
    comment_id="...",
)
```

</details>

---

#### `edit_comment_metadata`

**Edit comment metadata**
This endpoint edits the metadata of a comment. The metadata is a JSON object that can be used to store any information you want about the comment, in `string`, `number`, or `boolean` form. Set a property to `null` to remove it. Corresponds to [`liveblocks.editCommentMetadata`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-metadata).

- **HTTP:** `POST` `/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}/metadata`
- **Returns:** `CommentMetadata`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |
| `comment_id` | `str` | Yes |  |
| `body` | `EditCommentMetadataRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.edit_comment_metadata(
    room_id="...",
    thread_id="...",
    comment_id="...",
    body=...,
)
```

</details>

---

### deprecated

#### `get_thread_participants`

**Get thread participants**
**Deprecated.** Prefer using [thread subscriptions](#get-rooms-roomId-threads-threadId-subscriptions) instead.

- **HTTP:** `GET` `/rooms/{room_id}/threads/{thread_id}/participants`
- **Returns:** `GetThreadParticipantsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `thread_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_thread_participants(
    room_id="...",
    thread_id="...",
)
```

</details>

---

#### `get_room_notification_settings`

**Get room notification settings**
**Deprecated.** Renamed to [`/subscription-settings`](get-room-subscription-settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

- **HTTP:** `GET` `/rooms/{room_id}/users/{user_id}/notification-settings`
- **Returns:** `RoomSubscriptionSettings`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `user_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_room_notification_settings(
    room_id="...",
    user_id="...",
)
```

</details>

---

#### `update_room_notification_settings`

**Update room notification settings**
**Deprecated.** Renamed to [`/subscription-settings`](update-room-subscription-settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

- **HTTP:** `POST` `/rooms/{room_id}/users/{user_id}/notification-settings`
- **Returns:** `RoomSubscriptionSettings`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `user_id` | `str` | Yes |  |
| `body` | `UpdateRoomSubscriptionSettingsRequestBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_room_notification_settings(
    room_id="...",
    user_id="...",
)
```

</details>

---

#### `delete_room_notification_settings`

**Delete room notification settings**
**Deprecated.** Renamed to [`/subscription-settings`](delete-room-subscription-settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

- **HTTP:** `DELETE` `/rooms/{room_id}/users/{user_id}/notification-settings`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `user_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_room_notification_settings(
    room_id="...",
    user_id="...",
)
```

</details>

---

### auth

#### `authorize_user`

**Get access token with secret key**
This endpoint lets your application server (your back end) obtain a token that one of its clients (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own application’s custom authentication endpoint. When making this request, you’ll have to use your secret key.

- **HTTP:** `POST` `/authorize-user`
- **Returns:** `AuthorizeUserResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `AuthorizeUserRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.authorize_user(
    body=...,
)
```

</details>

---

#### `identify_user`

**Get ID token with secret key**
This endpoint lets your application server (your back end) obtain a token that one of its clients (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own application’s custom authentication endpoint. When using this endpoint to obtain ID tokens, you should manage your permissions by assigning user and/or group permissions to rooms explicitly, see our [Manage permissions with ID tokens](/docs/authentication/id-token) section.

- **HTTP:** `POST` `/identify-user`
- **Returns:** `IdentifyUserResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `IdentifyUserRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.identify_user(
    body=...,
)
```

</details>

---

### notifications

#### `get_inbox_notification`

**Get inbox notification**
This endpoint returns a user’s inbox notification by its ID. Corresponds to [`liveblocks.getInboxNotification`](/docs/api-reference/liveblocks-node#get-users-userId-inboxNotifications-inboxNotificationId).

- **HTTP:** `GET` `/users/{user_id}/inbox-notifications/{inbox_notification_id}`
- **Returns:** `InboxNotificationCustomData | InboxNotificationThreadData`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |
| `inbox_notification_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_inbox_notification(
    user_id="...",
    inbox_notification_id="...",
)
```

</details>

---

#### `delete_inbox_notification`

**Delete inbox notification**
This endpoint deletes a user’s inbox notification by its ID.

- **HTTP:** `DELETE` `/users/{user_id}/inbox-notifications/{inbox_notification_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |
| `inbox_notification_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_inbox_notification(
    user_id="...",
    inbox_notification_id="...",
)
```

</details>

---

#### `get_inbox_notifications`

**Get all inbox notifications**
This endpoint returns all the user’s inbox notifications. Corresponds to [`liveblocks.getInboxNotifications`](/docs/api-reference/liveblocks-node#get-users-userId-inboxNotifications).

- **HTTP:** `GET` `/users/{user_id}/inbox-notifications`
- **Returns:** `GetInboxNotificationsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |
| `organization_id` | `str \| Unset` | No |  |
| `query` | `str \| Unset` | No |  |
| `limit` | `int \| Unset` | No |  *(default: `50`)* |
| `starting_after` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_inbox_notifications(
    user_id="...",
)
```

</details>

---

#### `delete_all_inbox_notifications`

**Delete all inbox notifications**
This endpoint deletes all the user’s inbox notifications.

- **HTTP:** `DELETE` `/users/{user_id}/inbox-notifications`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_all_inbox_notifications(
    user_id="...",
)
```

</details>

---

#### `get_notification_settings`

**Get notification settings**
This endpoint returns a user's notification settings for the project. Corresponds to [`liveblocks.getNotificationSettings`](/docs/api-reference/liveblocks-node#get-users-userId-notification-settings).

- **HTTP:** `GET` `/users/{user_id}/notification-settings`
- **Returns:** `NotificationSettings`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_notification_settings(
    user_id="...",
)
```

</details>

---

#### `update_notification_settings`

**Update notification settings**
This endpoint updates a user's notification settings for the project. Corresponds to [`liveblocks.updateNotificationSettings`](/docs/api-reference/liveblocks-node#post-users-userId-notification-settings).

- **HTTP:** `POST` `/users/{user_id}/notification-settings`
- **Returns:** `NotificationSettings`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |
| `body` | `UpdateNotificationSettingsRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_notification_settings(
    user_id="...",
    body=...,
)
```

</details>

---

#### `delete_notification_settings`

**Delete notification settings**
This endpoint deletes a user's notification settings for the project. Corresponds to [`liveblocks.deleteNotificationSettings`](/docs/api-reference/liveblocks-node#delete-users-userId-notification-settings).

- **HTTP:** `DELETE` `/users/{user_id}/notification-settings`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_notification_settings(
    user_id="...",
)
```

</details>

---

#### `get_room_subscription_settings`

**Get room subscription settings**
This endpoint returns a user’s subscription settings for a specific room. Corresponds to [`liveblocks.getRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-rooms-roomId-users-userId-subscription-settings).

- **HTTP:** `GET` `/rooms/{room_id}/users/{user_id}/subscription-settings`
- **Returns:** `RoomSubscriptionSettings`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `user_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_room_subscription_settings(
    room_id="...",
    user_id="...",
)
```

</details>

---

#### `update_room_subscription_settings`

**Update room subscription settings**
This endpoint updates a user’s subscription settings for a specific room. Corresponds to [`liveblocks.updateRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#post-rooms-roomId-users-userId-subscription-settings).

- **HTTP:** `POST` `/rooms/{room_id}/users/{user_id}/subscription-settings`
- **Returns:** `RoomSubscriptionSettings`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `user_id` | `str` | Yes |  |
| `body` | `UpdateRoomSubscriptionSettingsRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_room_subscription_settings(
    room_id="...",
    user_id="...",
    body=...,
)
```

</details>

---

#### `delete_room_subscription_settings`

**Delete room subscription settings**
This endpoint deletes a user’s subscription settings for a specific room. Corresponds to [`liveblocks.deleteRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#delete-rooms-roomId-users-userId-subscription-settings).

- **HTTP:** `DELETE` `/rooms/{room_id}/users/{user_id}/subscription-settings`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes |  |
| `user_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_room_subscription_settings(
    room_id="...",
    user_id="...",
)
```

</details>

---

#### `get_user_room_subscription_settings`

**Get user room subscription settings**
This endpoint returns the list of a user's room subscription settings. Corresponds to [`liveblocks.getUserRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-users-userId-room-subscription-settings).

- **HTTP:** `GET` `/users/{user_id}/room-subscription-settings`
- **Returns:** `GetRoomSubscriptionSettingsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |
| `starting_after` | `str \| Unset` | No |  |
| `limit` | `int \| Unset` | No |  *(default: `50`)* |
| `organization_id` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_user_room_subscription_settings(
    user_id="...",
)
```

</details>

---

#### `trigger_inbox_notification`

**Trigger inbox notification**
This endpoint triggers an inbox notification. Corresponds to [`liveblocks.triggerInboxNotification`](/docs/api-reference/liveblocks-node#post-inbox-notifications-trigger).

- **HTTP:** `POST` `/inbox-notifications/trigger`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `TriggerInboxNotificationRequestBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.trigger_inbox_notification()
```

</details>

---

### groups

#### `get_groups`

**Get groups**
This endpoint returns a list of all groups in your project. Corresponds to [`liveblocks.getGroups`](/docs/api-reference/liveblocks-node#get-groups).

- **HTTP:** `GET` `/groups`
- **Returns:** `GetGroupsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `starting_after` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_groups()
```

</details>

---

#### `create_group`

**Create group**
This endpoint creates a new group. Corresponds to [`liveblocks.createGroup`](/docs/api-reference/liveblocks-node#create-group).

- **HTTP:** `POST` `/groups`
- **Returns:** `Group`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `CreateGroupRequestBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_group()
```

</details>

---

#### `get_group`

**Get group**
This endpoint returns a specific group by ID. Corresponds to [`liveblocks.getGroup`](/docs/api-reference/liveblocks-node#get-group).

- **HTTP:** `GET` `/groups/{group_id}`
- **Returns:** `Group`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_group(
    group_id="...",
)
```

</details>

---

#### `delete_group`

**Delete group**
This endpoint deletes a group. Corresponds to [`liveblocks.deleteGroup`](/docs/api-reference/liveblocks-node#delete-group).

- **HTTP:** `DELETE` `/groups/{group_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_group(
    group_id="...",
)
```

</details>

---

#### `add_group_members`

**Add group members**
This endpoint adds new members to an existing group. Corresponds to [`liveblocks.addGroupMembers`](/docs/api-reference/liveblocks-node#add-group-members).

- **HTTP:** `POST` `/groups/{group_id}/add-members`
- **Returns:** `Group`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes |  |
| `body` | `AddGroupMembersRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.add_group_members(
    group_id="...",
    body=...,
)
```

</details>

---

#### `remove_group_members`

**Remove group members**
This endpoint removes members from an existing group. Corresponds to [`liveblocks.removeGroupMembers`](/docs/api-reference/liveblocks-node#remove-group-members).

- **HTTP:** `POST` `/groups/{group_id}/remove-members`
- **Returns:** `Group`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes |  |
| `body` | `RemoveGroupMembersRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.remove_group_members(
    group_id="...",
    body=...,
)
```

</details>

---

#### `get_user_groups`

**Get user groups**
This endpoint returns all groups that a specific user is a member of. Corresponds to [`liveblocks.getUserGroups`](/docs/api-reference/liveblocks-node#get-user-groups).

- **HTTP:** `GET` `/users/{user_id}/groups`
- **Returns:** `GetUserGroupsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes |  |
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `starting_after` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_user_groups(
    user_id="...",
)
```

</details>

---

### ai

#### `get_ai_copilots`

**Get AI copilots**
This endpoint returns a paginated list of AI copilots. The copilots are returned sorted by creation date, from newest to oldest. Corresponds to [`liveblocks.getAiCopilots`](/docs/api-reference/liveblocks-node#get-ai-copilots).

- **HTTP:** `GET` `/ai/copilots`
- **Returns:** `GetAiCopilotsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `starting_after` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_ai_copilots()
```

</details>

---

#### `create_ai_copilot`

**Create AI copilot**
This endpoint creates a new AI copilot with the given configuration. Corresponds to [`liveblocks.createAiCopilot`](/docs/api-reference/liveblocks-node#create-ai-copilot).

- **HTTP:** `POST` `/ai/copilots`
- **Returns:** `AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `CreateAiCopilotOptionsAnthropic \| CreateAiCopilotOptionsGoogle \| CreateAiCopilotOptionsOpenAi \| CreateAiCopilotOptionsOpenAiCompatible` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_ai_copilot(
    body=...,
)
```

</details>

---

#### `get_ai_copilot`

**Get AI copilot**
This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](/docs/api-reference/liveblocks-node#get-ai-copilot).

- **HTTP:** `GET` `/ai/copilots/{copilot_id}`
- **Returns:** `AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_ai_copilot(
    copilot_id="...",
)
```

</details>

---

#### `update_ai_copilot`

**Update AI copilot**
This endpoint updates an existing AI copilot's configuration. Corresponds to [`liveblocks.updateAiCopilot`](/docs/api-reference/liveblocks-node#update-ai-copilot).

- **HTTP:** `POST` `/ai/copilots/{copilot_id}`
- **Returns:** `AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `body` | `UpdateAiCopilotRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_ai_copilot(
    copilot_id="...",
    body=...,
)
```

</details>

---

#### `delete_ai_copilot`

**Delete AI copilot**
This endpoint deletes an AI copilot by its ID. A deleted copilot is no longer accessible and cannot be restored. Corresponds to [`liveblocks.deleteAiCopilot`](/docs/api-reference/liveblocks-node#delete-ai-copilot).

- **HTTP:** `DELETE` `/ai/copilots/{copilot_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_ai_copilot(
    copilot_id="...",
)
```

</details>

---

#### `get_knowledge_sources`

**Get knowledge sources**
This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds to [`liveblocks.getKnowledgeSources`](/docs/api-reference/liveblocks-node#get-knowledge-sources).

- **HTTP:** `GET` `/ai/copilots/{copilot_id}/knowledge`
- **Returns:** `GetKnowledgeSourcesResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `starting_after` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_knowledge_sources(
    copilot_id="...",
)
```

</details>

---

#### `get_knowledge_source`

**Get knowledge source**
This endpoint returns a specific knowledge source by its ID. Corresponds to [`liveblocks.getKnowledgeSource`](/docs/api-reference/liveblocks-node#get-knowledge-source).

- **HTTP:** `GET` `/ai/copilots/{copilot_id}/knowledge/{knowledge_source_id}`
- **Returns:** `KnowledgeSourceFileSource | KnowledgeSourceWebSource`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `knowledge_source_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_knowledge_source(
    copilot_id="...",
    knowledge_source_id="...",
)
```

</details>

---

#### `create_web_knowledge_source`

**Create web knowledge source**
This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](/docs/api-reference/liveblocks-node#create-web-knowledge-source).

- **HTTP:** `POST` `/ai/copilots/{copilot_id}/knowledge/web`
- **Returns:** `CreateWebKnowledgeSourceResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `body` | `CreateWebKnowledgeSourceRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_web_knowledge_source(
    copilot_id="...",
    body=...,
)
```

</details>

---

#### `create_file_knowledge_source`

**Create file knowledge source**
This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can then reference the content of the file when responding. Corresponds to [`liveblocks.createFileKnowledgeSource`](/docs/api-reference/liveblocks-node#create-file-knowledge-source).

- **HTTP:** `PUT` `/ai/copilots/{copilot_id}/knowledge/file/{name}`
- **Returns:** `CreateFileKnowledgeSourceResponse200`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `name` | `str` | Yes |  |
| `body` | `File` | Yes | Request body (application/octet-stream) |

<details>
<summary>Example</summary>

```python
result = client.create_file_knowledge_source(
    copilot_id="...",
    name="...",
    body=...,
)
```

</details>

---

#### `get_file_knowledge_source_markdown`

**Get file knowledge source content**
This endpoint returns the content of a file knowledge source as markdown. This allows you to see what content the AI copilot has access to from uploaded files. Corresponds to [`liveblocks.getFileKnowledgeSourceMarkdown`](/docs/api-reference/liveblocks-node#get-file-knowledge-source-markdown).

- **HTTP:** `GET` `/ai/copilots/{copilot_id}/knowledge/file/{knowledge_source_id}`
- **Returns:** `GetFileKnowledgeSourceMarkdownResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `knowledge_source_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_file_knowledge_source_markdown(
    copilot_id="...",
    knowledge_source_id="...",
)
```

</details>

---

#### `delete_file_knowledge_source`

**Delete file knowledge source**
This endpoint deletes a file knowledge source from an AI copilot. The copilot will no longer have access to the content from this file. Corresponds to [`liveblocks.deleteFileKnowledgeSource`](/docs/api-reference/liveblocks-node#delete-file-knowledge-source).

- **HTTP:** `DELETE` `/ai/copilots/{copilot_id}/knowledge/file/{knowledge_source_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `knowledge_source_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_file_knowledge_source(
    copilot_id="...",
    knowledge_source_id="...",
)
```

</details>

---

#### `delete_web_knowledge_source`

**Delete web knowledge source**
This endpoint deletes a web knowledge source from an AI copilot. The copilot will no longer have access to the content from this source. Corresponds to [`liveblocks.deleteWebKnowledgeSource`](/docs/api-reference/liveblocks-node#delete-web-knowledge-source).

- **HTTP:** `DELETE` `/ai/copilots/{copilot_id}/knowledge/web/{knowledge_source_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `knowledge_source_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_web_knowledge_source(
    copilot_id="...",
    knowledge_source_id="...",
)
```

</details>

---

#### `get_web_knowledge_source_links`

**Get web knowledge source links**
This endpoint returns a paginated list of links that were indexed from a web knowledge source. This is useful for understanding what content the AI copilot has access to from web sources. Corresponds to [`liveblocks.getWebKnowledgeSourceLinks`](/docs/api-reference/liveblocks-node#get-web-knowledge-source-links).

- **HTTP:** `GET` `/ai/copilots/{copilot_id}/knowledge/web/{knowledge_source_id}/links`
- **Returns:** `GetWebKnowledgeSourceLinksResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes |  |
| `knowledge_source_id` | `str` | Yes |  |
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `starting_after` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_web_knowledge_source_links(
    copilot_id="...",
    knowledge_source_id="...",
)
```

</details>

---

### management

#### `get_management_projects`

**List projects**
Returns a paginated list of projects. You can limit the number of projects returned per page and use the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

- **HTTP:** `GET` `/management/projects`
- **Returns:** `GetManagementProjectsResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `cursor` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_management_projects()
```

</details>

---

#### `create_management_project`

**Create project**
Creates a new project within your account. This endpoint requires the `write:all` scope. You can specify the project type, name, and version creation timeout. Upon success, returns information about the newly created project, including its ID, keys, region, and settings.

- **HTTP:** `POST` `/management/projects`
- **Returns:** `CreateManagementProjectResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `CreateManagementProjectRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_management_project(
    body=...,
)
```

</details>

---

#### `get_management_project`

**Get project**
Returns a single project specified by its ID. This endpoint requires the `read:all` scope. If the project cannot be found, a 404 error response is returned.

- **HTTP:** `GET` `/management/projects/{project_id}`
- **Returns:** `GetManagementProjectResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_management_project(
    project_id="...",
)
```

</details>

---

#### `update_management_project`

**Update project**
Updates an existing project specified by its ID. This endpoint allows you to modify project details such as the project name and the version creation timeout. The `versionCreationTimeout` can be set to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from the request body will not be updated. Requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}`
- **Returns:** `UpdateManagementProjectResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `body` | `UpdateManagementProjectRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_management_project(
    project_id="...",
    body=...,
)
```

</details>

---

#### `delete_management_project`

**Delete project**
Soft deletes the project specified by its ID. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

- **HTTP:** `DELETE` `/management/projects/{project_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_management_project(
    project_id="...",
)
```

</details>

---

#### `activate_project_public_api_key`

**Activate public key**
Activates the public API key associated with the specified project. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

- **HTTP:** `POST` `/management/projects/{project_id}/api-keys/public/activate`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.activate_project_public_api_key(
    project_id="...",
)
```

</details>

---

#### `deactivate_project_public_api_key`

**Deactivate public key**
Deactivates the public API key associated with the specified project. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

- **HTTP:** `POST` `/management/projects/{project_id}/api-keys/public/deactivate`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.deactivate_project_public_api_key(
    project_id="...",
)
```

</details>

---

#### `roll_project_public_api_key`

**Roll public key**
Rolls (rotates) the public API key associated with the specified project, generating a new key value while deprecating the previous one. The new key becomes immediately active. This endpoint requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}/api-keys/public/roll`
- **Returns:** `RollProjectPublicApiKeyResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `body` | `RollProjectPublicApiKeyRequestBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.roll_project_public_api_key(
    project_id="...",
)
```

</details>

---

#### `roll_project_secret_api_key`

**Roll secret key**
Rolls (rotates) the secret API key associated with the specified project, generating a new key value while deprecating the previous one. The new key becomes immediately active. This endpoint requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}/api-keys/secret/roll`
- **Returns:** `ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `body` | `RollProjectSecretApiKeyRequestBody \| Unset` | No | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.roll_project_secret_api_key(
    project_id="...",
)
```

</details>

---

#### `get_management_webhooks`

**List webhooks**
Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The response includes an array of webhook objects associated with the specified project, as well as a `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter from the `nextCursor` value in the previous response to fetch subsequent pages. If the project cannot be found, a 404 error response is returned.

- **HTTP:** `GET` `/management/projects/{project_id}/webhooks`
- **Returns:** `GetManagementWebhooksResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `limit` | `int \| Unset` | No |  *(default: `20`)* |
| `cursor` | `str \| Unset` | No |  |

<details>
<summary>Example</summary>

```python
result = client.get_management_webhooks(
    project_id="...",
)
```

</details>

---

#### `create_management_webhook`

**Create webhook**
Creates a new webhook for a project. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

- **HTTP:** `POST` `/management/projects/{project_id}/webhooks`
- **Returns:** `CreateManagementWebhookResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `body` | `CreateManagementWebhookRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.create_management_webhook(
    project_id="...",
    body=...,
)
```

</details>

---

#### `get_management_webhook`

**Get webhook**
Get one webhook by `webhookId` for a project. Returns webhook settings such as URL, subscribed events, disabled state, throttling, and additional headers. Returns `404` if the project or webhook does not exist. This endpoint requires the `read:all` scope.

- **HTTP:** `GET` `/management/projects/{project_id}/webhooks/{webhook_id}`
- **Returns:** `GetManagementWebhookResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_management_webhook(
    project_id="...",
    webhook_id="...",
)
```

</details>

---

#### `update_management_webhook`

**Update webhook**
Update one webhook by `webhookId` for a project. Send only fields you want to change; omitted fields stay unchanged. Returns `404` if the project or webhook does not exist and `422` for validation errors. This endpoint requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}/webhooks/{webhook_id}`
- **Returns:** `UpdateManagementWebhookResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |
| `body` | `UpdateManagementWebhookRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.update_management_webhook(
    project_id="...",
    webhook_id="...",
    body=...,
)
```

</details>

---

#### `delete_management_webhook`

**Delete webhook**
Delete one webhook by `webhookId` for a project. Returns `200` with an empty body on success, or `404` if the project or webhook does not exist. Requires `write:all`.

- **HTTP:** `DELETE` `/management/projects/{project_id}/webhooks/{webhook_id}`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.delete_management_webhook(
    project_id="...",
    webhook_id="...",
)
```

</details>

---

#### `roll_management_webhook_secret`

**Roll webhook secret**
Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24 hours. Returns `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}/webhooks/{webhook_id}/secret/roll`
- **Returns:** `RotateManagementWebhookSecretResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.roll_management_webhook_secret(
    project_id="...",
    webhook_id="...",
)
```

</details>

---

#### `get_management_webhook_additional_headers`

**Get webhook headers**
Get a webhook's additional headers. Returns `404` if the project or webhook does not exist. Requires `read:all`.

- **HTTP:** `GET` `/management/projects/{project_id}/webhooks/{webhook_id}/additional-headers`
- **Returns:** `GetManagementWebhookHeadersResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |

<details>
<summary>Example</summary>

```python
result = client.get_management_webhook_additional_headers(
    project_id="...",
    webhook_id="...",
)
```

</details>

---

#### `upsert_management_webhook_additional_headers`

**Patch webhook headers**
Upsert additional headers for a webhook. Provided headers are merged with existing headers, and existing values are overwritten when names match. Returns updated headers, or `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}/webhooks/{webhook_id}/additional-headers`
- **Returns:** `UpsertManagementWebhookHeadersResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |
| `body` | `UpsertManagementWebhookHeadersRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.upsert_management_webhook_additional_headers(
    project_id="...",
    webhook_id="...",
    body=...,
)
```

</details>

---

#### `delete_management_webhook_additional_headers`

**Delete webhook headers**
Remove selected additional headers from a webhook. Send header names in `headers` field; other headers are unchanged. Returns updated headers, or `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope. At least one header name must be provided; otherwise, a 422 error response is returned.

- **HTTP:** `POST` `/management/projects/{project_id}/webhooks/{webhook_id}/delete-additional-headers`
- **Returns:** `DeleteManagementWebhookHeadersResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |
| `body` | `DeleteManagementWebhookHeadersRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.delete_management_webhook_additional_headers(
    project_id="...",
    webhook_id="...",
    body=...,
)
```

</details>

---

#### `recover_failed_webhook_messages`

**Recover failed webhook messages**
Requeue failed deliveries for a webhook from the given `since` timestamp. Returns `200` with an empty body when recovery starts, an `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}/webhooks/{webhook_id}/recover-failed-messages`
- **Returns:** `None`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |
| `body` | `RecoverManagementWebhookFailedMessagesRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.recover_failed_webhook_messages(
    project_id="...",
    webhook_id="...",
    body=...,
)
```

</details>

---

#### `send_test_webhook`

**Send test webhook**
Send a test event to a webhook and return the created message metadata. `subscribedEvent` must be one of the webhook's subscribed events, otherwise the endpoint returns `422`. Returns `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

- **HTTP:** `POST` `/management/projects/{project_id}/webhooks/{webhook_id}/test`
- **Returns:** `TestManagementWebhookResponse`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes |  |
| `webhook_id` | `str` | Yes |  |
| `body` | `TestManagementWebhookRequestBody` | Yes | Request body (application/json) |

<details>
<summary>Example</summary>

```python
result = client.send_test_webhook(
    project_id="...",
    webhook_id="...",
    body=...,
)
```

</details>

---


## Models

The following data models are available in `liveblocks.models`:

- `ActiveUsersResponse`
- `AddCommentReactionRequestBody`
- `AddGroupMembersRequestBody`
- `AiCopilotAnthropic`
- `AiCopilotBase`
- `AiCopilotGoogle`
- `AiCopilotOpenAi`
- `AiCopilotOpenAiCompatible`
- `AiCopilotProviderSettings`
- `AnthropicProviderOptions`
- `Authorization`
- `AuthorizeUserRequestBody`
- `AuthorizeUserResponse`
- `Comment`
- `CommentAttachment`
- `CommentBody`
- `CommentMetadata`
- `CommentReaction`
- `CreateAiCopilotOptionsAnthropic`
- `CreateAiCopilotOptionsBase`
- `CreateAiCopilotOptionsGoogle`
- `CreateAiCopilotOptionsOpenAi`
- `CreateAiCopilotOptionsOpenAiCompatible`
- `CreateCommentRequestBody`
- `CreateGroupRequestBody`
- `CreateManagementProjectRequestBody`
- `CreateManagementProjectResponse`
- `CreateManagementWebhookRequestBody`
- `CreateManagementWebhookResponse`
- `CreateRoomRequestBody`
- `CreateThreadRequestBody`
- `CreateWebKnowledgeSourceRequestBody`
- `CreateWebKnowledgeSourceResponse`
- `CreateYjsVersionResponse`
- `DeleteManagementWebhookHeadersRequestBody`
- `DeleteManagementWebhookHeadersResponse`
- `EditCommentMetadataRequestBody`
- `EditCommentRequestBody`
- `Error`
- `GetAiCopilotsResponse`
- `GetFileKnowledgeSourceMarkdownResponse`
- `GetGroupsResponse`
- `GetInboxNotificationsResponse`
- `GetKnowledgeSourcesResponse`
- `GetManagementProjectResponse`
- `GetManagementProjectsResponse`
- `GetManagementWebhookHeadersResponse`
- `GetManagementWebhookResponse`
- `GetManagementWebhooksResponse`
- `GetRoomsResponse`
- `GetRoomSubscriptionSettingsResponse`
- `GetStorageDocumentResponse`
- `GetThreadParticipantsResponse`
- `GetThreadsResponse`
- `GetThreadSubscriptionsResponse`
- `GetUserGroupsResponse`
- `GetWebKnowledgeSourceLinksResponse`
- `GetYjsDocumentResponse`
- `GetYjsVersionsResponse`
- `GoogleProviderOptions`
- `Group`
- `GroupMember`
- `IdentifyUserRequestBody`
- `IdentifyUserResponse`
- `InboxNotificationActivity`
- `InboxNotificationCustomData`
- `InboxNotificationThreadData`
- `InitializeStorageDocumentResponse`
- `KnowledgeSourceBase`
- `KnowledgeSourceFileSource`
- `KnowledgeSourceWebSource`
- `ManagementProject`
- `ManagementProjectPublicKey`
- `ManagementProjectSecretKey`
- `ManagementWebhook`
- `ManagementWebhookAdditionalHeaders`
- `ManagementWebhookHeadersDelete`
- `ManagementWebhookSecret`
- `NotificationChannelSettings`
- `NotificationSettings` — Notification settings for each supported channel
- `OpenAiProviderOptions`
- `AddJsonPatchOperation`
- `CopyJsonPatchOperation`
- `MoveJsonPatchOperation`
- `RemoveJsonPatchOperation`
- `ReplaceJsonPatchOperation`
- `TestJsonPatchOperation`
- `RecoverManagementWebhookFailedMessagesRequestBody`
- `RemoveCommentReactionRequestBody`
- `RemoveGroupMembersRequestBody`
- `RollProjectPublicApiKeyRequestBody`
- `RollProjectPublicApiKeyResponse`
- `RollProjectSecretApiKeyRequestBody`
- `ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse`
- `Room`
- `RoomAccesses`
- `RoomMetadata`
- `RoomSubscriptionSettings`
- `RotateManagementWebhookSecretResponse`
- `SetPresenceRequestBody`
- `SubscribeToThreadRequestBody`
- `Subscription`
- `TestManagementWebhookRequestBody`
- `TestManagementWebhookResponse`
- `Thread`
- `ThreadMetadata`
- `TriggerInboxNotificationRequestBody`
- `UnsubscribeFromThreadRequestBody`
- `UpdateAiCopilotRequestBody`
- `UpdateManagementProjectRequestBody`
- `UpdateManagementProjectResponse`
- `UpdateManagementWebhookRequestBody`
- `UpdateManagementWebhookResponse`
- `UpdateNotificationSettingsRequestBody` — Partial notification settings - all properties are optional
- `UpdateRoomIdRequestBody`
- `UpdateRoomRequestBody`
- `UpdateRoomSubscriptionSettingsRequestBody` — Partial room subscription settings - all properties are optional
- `UpdateThreadMetadataRequestBody`
- `UpsertManagementWebhookHeadersRequestBody`
- `UpsertManagementWebhookHeadersResponse`
- `UpsertRoomRequestBody`
- `UserRoomSubscriptionSettings`
- `UserSubscription`
- `WebKnowledgeSourceLink`
- `YjsVersion`
- `TriggerInboxNotificationRequestBodyActivityData`
- `CreateManagementWebhookRequestBodyAdditionalHeaders`
- `AnthropicProviderOptionsAnthropic`
- `YjsVersionAuthorsItem`
- `InitializeStorageDocumentBody`
- `CreateThreadRequestBodyComment`
- `CommentBodyContentItem`
- `SetPresenceRequestBodyData` — Presence data as a JSON object
- `InitializeStorageDocumentResponseData`
- `CreateYjsVersionResponseData`
- `InboxNotificationActivityData`
- `InitializeStorageDocumentBodyData`
- `ActiveUsersResponseDataItem`
- `KnowledgeSourceFileSourceFile`
- `GoogleProviderOptionsGoogle`
- `UpdateRoomRequestBodyGroupsAccesses` — A map of group identifiers to permissions list. Setting the value as `null` will clear all groups’ accesses. Setting one group identifier as `null` will clear this group’s accesses.
- `UpsertManagementWebhookHeadersResponseHeaders`
- `ActiveUsersResponseDataItemInfo`
- `KnowledgeSourceWebSourceLink`
- `TestManagementWebhookResponseMessage`
- `UpdateRoomRequestBodyMetadata`
- `UpdateThreadMetadataRequestBodyMetadata`
- `EditCommentMetadataRequestBodyMetadata`
- `OpenAiProviderOptionsOpenai`
- `AuthorizeUserRequestBodyPermissions`
- `CreateFileKnowledgeSourceResponse200`
- `GroupScopes`
- `CreateGroupRequestBodyScopes`
- `AnthropicProviderOptionsAnthropicAnthropicThinkingDisabled`
- `AnthropicProviderOptionsAnthropicAnthropicThinkingEnabled`
- `GoogleProviderOptionsGoogleThinkingConfig`
- `SetPresenceRequestBodyUserInfo` — Metadata about the user or agent
- `AuthorizeUserRequestBodyUserInfo`
- `IdentifyUserRequestBodyUserInfo`
- `UpdateRoomRequestBodyUsersAccesses` — A map of user identifiers to permissions list. Setting the value as `null` will clear all users’ accesses. Setting one user identifier as `null` will clear this user’s accesses.
- `OpenAiProviderOptionsOpenaiWebSearch`
- `AnthropicProviderOptionsAnthropicAnthropicWebSearch`

## Error Handling

All API methods raise `errors.LiveblocksError` when the server returns a non-2xx status code. You can catch and inspect these errors:

```python
from liveblocks import errors, Liveblocks

client = Liveblocks(secret="sk_your_secret_key")

with client:
    try:
        room = client.get_room(room_id="my-room")
    except errors.LiveblocksError as e:
        print(f"API error: {e}")
```

Methods also raise `httpx.TimeoutException` if the request exceeds the timeout.