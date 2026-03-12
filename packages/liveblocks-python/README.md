# @liveblocks/python

`@liveblocks/python` provides you with a Python client for accessing the Liveblocks API. This library is only intended for use in your Python back end.

## Installation

Install the Liveblocks package to get started.

```bash
pip install liveblocks
```

## Quickstart

All API calls require a Liveblocks client set up with your secret key. Find your key in the [Liveblocks Dashboard](https://liveblocks.io/dashboard/apikeys).

### Synchronous

```python
from liveblocks import Liveblocks

client = Liveblocks(secret="{{SECRET_KEY}}")

with client:
    rooms = client.get_rooms()
    print(rooms)
```

### Asynchronous

```python
from liveblocks import AsyncLiveblocks

client = AsyncLiveblocks(secret="{{SECRET_KEY}}")

async with client:
    rooms = await client.get_rooms()
    print(rooms)
```

---

## API Reference

### Room

#### get_rooms

This endpoint returns a list of your rooms. The rooms are returned sorted by creation date, from newest to oldest. You can filter rooms by room ID prefixes, metadata, users accesses, and groups accesses. Corresponds to [`liveblocks.getRooms`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms).

There is a pagination system where the cursor to the next page is returned in the response as `nextCursor`, which can be combined with `startingAfter`.
You can also limit the number of rooms by query.

Filtering by metadata works by giving key values like `metadata.color=red`. Of course you can combine multiple metadata clauses to refine the response like `metadata.color=red&metadata.type=text`. Notice here the operator AND is applied between each clauses.

Filtering by groups or userId works by giving a list of groups like `groupIds=marketing,GZo7tQ,product` or/and a userId like `userId=user1`.
Notice here the operator OR is applied between each `groupIds` and the `userId`.


**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No | A limit on the number of rooms to be returned. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |
| `organization_id` | `str \| Unset` | No | A filter on organization ID. |
| `query` | `str \| Unset` | No | Query to filter rooms. You can filter by `roomId` and `metadata`, for example, `metadata["roomType"]:"whiteboard" AND roomId^"liveblocks:engineering"`. Learn more about [filtering rooms with query language](https://liveblocks.io/docs/guides/how-to-filter-rooms-using-query-language). |
| `user_id` | `str \| Unset` | No | A filter on users accesses. |
| `group_ids` | `str \| Unset` | No | A filter on groups accesses. Multiple groups can be used. |


---

#### create_room

This endpoint creates a new room. `id` and `defaultAccesses` are required. When provided with a `?idempotent` query argument, will not return a 409 when the room already exists, but instead return the existing room as-is. Corresponds to [`liveblocks.createRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms), or to [`liveblocks.getOrCreateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-or-create-rooms-roomId) when `?idempotent` is provided. 
- `defaultAccesses` could be `[]` or `["room:write"]` (private or public). 
- `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum. `metadata` is optional field.
- `usersAccesses` could be `[]` or `["room:write"]` for every records. `usersAccesses` can contain 100 ids maximum. Id length has a limit of 40 characters. `usersAccesses` is optional field.
- `groupsAccesses` are optional fields.


**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `idempotent` | `bool \| Unset` | No | When provided, will not return a 409 when the room already exists, but instead return the existing room as-is. Corresponds to [`liveblocks.getOrCreateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-or-create-rooms-roomId). |
| `body` | `CreateRoomRequestBody` | Yes | Request body (application/json) |


---

#### get_room

This endpoint returns a room by its ID. Corresponds to [`liveblocks.getRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomid).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |


---

#### update_room

This endpoint updates specific properties of a room. Corresponds to [`liveblocks.updateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomid). 

It’s not necessary to provide the entire room’s information. 
Setting a property to `null` means to delete this property. For example, if you want to remove access to a specific user without losing other users: 
``{
    "usersAccesses": {
        "john": null
    }
}``
`defaultAccesses`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

- `defaultAccesses` could be `[]` or `["room:write"]` (private or public). 
- `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum. `metadata` is optional field.
- `usersAccesses` could be `[]` or `["room:write"]` for every records. `usersAccesses` can contain 100 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
- `groupsAccesses` could be `[]` or `["room:write"]` for every records. `groupsAccesses` can contain 100 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional field.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `body` | `UpdateRoomRequestBody` | Yes | Request body (application/json) |


---

#### delete_room

This endpoint deletes a room. A deleted room is no longer accessible from the API or the dashboard and it cannot be restored. Corresponds to [`liveblocks.deleteRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-roomid).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |


---

#### prewarm_room

Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be connecting to a room with [`RoomProvider`](https://liveblocks.io/docs/api-reference/liveblocks-react#RoomProvider) or [`enterRoom`](https://liveblocks.io/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the room will load quicker. Corresponds to [`liveblocks.prewarmRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomid-prewarm).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |


---

#### upsert_room

This endpoint updates specific properties of a room. Corresponds to [`liveblocks.upsertRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#upsert-rooms-roomId). 

It’s not necessary to provide the entire room’s information. 
Setting a property to `null` means to delete this property. For example, if you want to remove access to a specific user without losing other users: 
``{
    "usersAccesses": {
        "john": null
    }
}``
`defaultAccesses`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

- `defaultAccesses` could be `[]` or `["room:write"]` (private or public). 
- `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum. `metadata` is optional field.
- `usersAccesses` could be `[]` or `["room:write"]` for every records. `usersAccesses` can contain 100 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
- `groupsAccesses` could be `[]` or `["room:write"]` for every records. `groupsAccesses` can contain 100 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional field.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `body` | `UpsertRoomRequestBody` | Yes | Request body (application/json) |


---

#### update_room_id

This endpoint permanently updates the room’s ID. All existing references to the old room ID will need to be updated. Returns the updated room. Corresponds to [`liveblocks.updateRoomId`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomid-update-room-id).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | The new ID for the room |
| `body` | `UpdateRoomIdRequestBody \| Unset` | No | Request body (application/json) |


---

#### get_active_users

This endpoint returns a list of users currently present in the requested room. Corresponds to [`liveblocks.getActiveUsers`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomid-active-users). 

For optimal performance, we recommend calling this endpoint no more than once every 10 seconds. 
Duplicates can occur if a user is in the requested room with multiple browser tabs opened.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |


---

#### set_presence

This endpoint sets ephemeral presence for a user in a room without requiring a WebSocket connection. The presence data will automatically expire after the specified TTL (time-to-live). This is useful for scenarios like showing an AI agent's presence in a room. The presence will be broadcast to all connected users in the room. Corresponds to [`liveblocks.setPresence`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-presence).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `body` | `SetPresenceRequestBody` | Yes | Request body (application/json) |


---

#### broadcast_event

This endpoint enables the broadcast of an event to a room without having to connect to it via the `client` from `@liveblocks/client`. It takes any valid JSON as a request body. The `connectionId` passed to event listeners is `-1` when using this API. Corresponds to [`liveblocks.broadcastEvent`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-broadcast-event).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `body` | `Any` | Yes | Request body (application/json) |


---

### Storage

#### get_storage_document

Returns the contents of the room’s Storage tree. Corresponds to [`liveblocks.getStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-storage). 

The default outputted format is called “plain LSON”, which includes information on the Live data structures in the tree. These nodes show up in the output as objects with two properties, for example:

```json
{
  "liveblocksType": "LiveObject",
  "data": ...
}
```

If you’re not interested in this information, you can use the simpler `?format=json` query param, see below.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `format_` | `GetStorageDocumentFormat \| Unset` | No | Use the `json` format to output a simplified JSON representation of the Storage tree. In that format, each LiveObject and LiveMap will be formatted as a simple JSON object, and each LiveList will be formatted as a simple JSON array. This is a lossy format because information about the original data structures is not retained, but it may be easier to work with. |


---

#### initialize_storage_document

This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling this endpoint will disconnect all users from the room if there are any, triggering a reconnect. Corresponds to [`liveblocks.initializeStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-storage).

The format of the request body is the same as what’s returned by the get Storage endpoint.

For each Liveblocks data structure that you want to create, you need a JSON element having two properties:
- `"liveblocksType"` => `"LiveObject" | "LiveList" | "LiveMap"`
- `"data"` => contains the nested data structures (children) and data.

The root’s type can only be LiveObject.

A utility function, `toPlainLson` is included in `@liveblocks/client` from `1.0.9` to help convert `LiveObject`, `LiveList`, and `LiveMap` to the structure expected by the endpoint.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `body` | `InitializeStorageDocumentBody \| Unset` | No | Request body (application/json) |


---

#### delete_storage_document

This endpoint deletes all of the room’s Storage data. Calling this endpoint will disconnect all users from the room if there are any. Corresponds to [`liveblocks.deleteStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-roomId-storage).


**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |


---

#### patch_storage_document

Applies a sequence of [JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902) operations to the room's Storage document, useful for modifying Storage. Operations are applied in order; if any operation fails, the document is not changed and a 422 response with a helpful message is returned.

**Paths and data types:** Be as specific as possible with your target path. Every parent in the chain of path segments must be a LiveObject, LiveList, or LiveMap. Complex nested objects passed in `add` or `replace` operations are automatically converted to LiveObjects and LiveLists.

**Performance:** For large Storage documents, applying a patch can be expensive because the full state is reconstructed on the server to apply the operations. Very large documents may not be suitable for this endpoint.

For a **full guide with examples**, see [Modifying storage via REST API with JSON Patch](https://liveblocks.io/docs/guides/modifying-storage-via-rest-api-with-json-patch).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `body` | `list[AddJsonPatchOperation \| CopyJsonPatchOperation \| MoveJsonPatchOperation \| RemoveJsonPatchOperation \| ReplaceJsonPatchOperation \| TestJsonPatchOperation]` | Yes | Request body (application/json) |


---

### Yjs

#### get_yjs_document

This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to [`liveblocks.getYjsDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `formatting` | `bool \| Unset` | No | If present, YText will return formatting. |
| `key` | `str \| Unset` | No | Returns only a single key’s value, e.g. `doc.get(key).toJSON()`. |
| `type_` | `GetYjsDocumentType \| Unset` | No | Used with key to override the inferred type, i.e. `"ymap"` will return `doc.get(key, Y.Map)`. |


---

#### send_yjs_binary_update

This endpoint is used to send a Yjs binary update to the room’s Yjs document. You can use this endpoint to initialize Yjs data for the room or to update the room’s Yjs document. To send an update to a subdocument instead of the main document, pass its `guid`. Corresponds to [`liveblocks.sendYjsBinaryUpdate`](https://liveblocks.io/docs/api-reference/liveblocks-node#put-rooms-roomId-ydoc).

The update is typically obtained by calling `Y.encodeStateAsUpdate(doc)`. See the [Yjs documentation](https://docs.yjs.dev/api/document-updates) for more details. When manually making this HTTP call, set the HTTP header `Content-Type` to `application/octet-stream`, and send the binary update (a `Uint8Array`) in the body of the HTTP request. This endpoint does not accept JSON, unlike most other endpoints.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `guid` | `str \| Unset` | No | ID of the subdocument |
| `body` | `File` | Yes | Request body (application/octet-stream) |


---

#### get_yjs_document_as_binary_update

This endpoint returns the room's Yjs document encoded as a single binary update. This can be used by `Y.applyUpdate(responseBody)` to get a copy of the document in your back end. See [Yjs documentation](https://docs.yjs.dev/api/document-updates) for more information on working with updates. To return a subdocument instead of the main document, pass its `guid`. Corresponds to [`liveblocks.getYjsDocumentAsBinaryUpdate`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc-binary).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `guid` | `str \| Unset` | No | ID of the subdocument |


---

#### get_yjs_versions

This endpoint returns a list of version history snapshots for the room's Yjs document. The versions are returned sorted by creation date, from newest to oldest.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `limit` | `int \| Unset` | No | A limit on the number of versions to be returned. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `cursor` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

#### get_yjs_version

This endpoint returns a specific version of the room's Yjs document encoded as a binary Yjs update.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `version_id` | `str` | Yes | ID of the version |


---

#### create_yjs_version

This endpoint creates a new version history snapshot for the room's Yjs document.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |


---

### Comments

#### get_threads

This endpoint returns the threads in the requested room. Corresponds to [`liveblocks.getThreads`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-threads).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `query` | `str \| Unset` | No | Query to filter threads. You can filter by `metadata` and `resolved`, for example, `metadata["status"]:"open" AND metadata["color"]:"red" AND resolved:true`. Learn more about [filtering threads with query language](https://liveblocks.io/docs/guides/how-to-filter-threads-using-query-language). |


---

#### create_thread

This endpoint creates a new thread and the first comment in the thread. Corresponds to [`liveblocks.createThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads).

A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to construct a comment’s body, which can be submitted under `comment.body`.

```json
{
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "children": [{ "text": "Hello " }, { "text": "world", "bold": true }]
    }
  ]
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `body` | `CreateThreadRequestBody` | Yes | Request body (application/json) |


---

#### get_thread

This endpoint returns a thread by its ID. Corresponds to [`liveblocks.getThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-threadId).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |


---

#### delete_thread

This endpoint deletes a thread by its ID. Corresponds to [`liveblocks.deleteThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-roomId-threads-threadId).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |


---

#### get_thread_participants

**Deprecated.** Prefer using [thread subscriptions](#get-rooms-roomId-threads-threadId-subscriptions) instead.

This endpoint returns the list of thread participants. It is a list of unique user IDs representing all the thread comment authors and mentioned users in comments. Corresponds to [`liveblocks.getThreadParticipants`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-threadId-participants).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |


---

#### edit_thread_metadata

This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `body` | `EditThreadMetadataRequestBody` | Yes | Request body (application/json) |


---

#### mark_thread_as_resolved

This endpoint marks a thread as resolved. The request body must include a `userId` to identify who resolved the thread. Returns the updated thread. Corresponds to [`liveblocks.markThreadAsResolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-mark-as-resolved).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `body` | `MarkThreadAsResolvedRequestBody` | Yes | Request body (application/json) |


---

#### mark_thread_as_unresolved

This endpoint marks a thread as unresolved. The request body must include a `userId` to identify who unresolved the thread. Returns the updated thread. Corresponds to [`liveblocks.markThreadAsUnresolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-mark-as-unresolved).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `body` | `MarkThreadAsUnresolvedRequestBody` | Yes | Request body (application/json) |


---

#### subscribe_to_thread

This endpoint subscribes to a thread. Corresponds to [`liveblocks.subscribeToThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-subscribe).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `body` | `SubscribeToThreadRequestBody` | Yes | Request body (application/json) |


---

#### unsubscribe_from_thread

This endpoint unsubscribes from a thread. Corresponds to [`liveblocks.unsubscribeFromThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-unsubscribe).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `body` | `UnsubscribeFromThreadRequestBody` | Yes | Request body (application/json) |


---

#### get_thread_subscriptions

This endpoint gets the list of subscriptions to a thread. Corresponds to [`liveblocks.getThreadSubscriptions`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-threadId-subscriptions).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |


---

#### create_comment

This endpoint creates a new comment, adding it as a reply to a thread. Corresponds to [`liveblocks.createComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments).

A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to construct a comment’s body, which can be submitted under `body`.

```json
{
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "children": [{ "text": "Hello " }, { "text": "world", "bold": true }]
    }
  ]
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `body` | `CreateCommentRequestBody` | Yes | Request body (application/json) |


---

#### get_comment

This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `comment_id` | `str` | Yes | ID of the comment |


---

#### edit_comment

This endpoint edits the specified comment. Corresponds to [`liveblocks.editComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId).

A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to construct a comment’s body, which can be submitted under `body`.

```json
{
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "children": [{ "text": "Hello " }, { "text": "world", "bold": true }]
    }
  ]
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `comment_id` | `str` | Yes | ID of the comment |
| `body` | `EditCommentRequestBody` | Yes | Request body (application/json) |


---

#### delete_comment

This endpoint deletes a comment. A deleted comment is no longer accessible from the API or the dashboard and it cannot be restored. Corresponds to [`liveblocks.deleteComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `comment_id` | `str` | Yes | ID of the comment |


---

#### add_comment_reaction

This endpoint adds a reaction to a comment. Corresponds to [`liveblocks.addCommentReaction`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-add-reaction).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `comment_id` | `str` | Yes | ID of the comment |
| `body` | `AddCommentReactionRequestBody` | Yes | Request body (application/json) |


---

#### remove_comment_reaction

This endpoint removes a comment reaction. A deleted comment reaction is no longer accessible from the API or the dashboard and it cannot be restored. Corresponds to [`liveblocks.removeCommentReaction`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-add-reaction).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `comment_id` | `str` | Yes | ID of the comment |
| `body` | `RemoveCommentReactionRequestBody \| Unset` | No | Request body (application/json) |


---

#### edit_comment_metadata

This endpoint edits the metadata of a comment. The metadata is a JSON object that can be used to store any information you want about the comment, in `string`, `number`, or `boolean` form. Set a property to `null` to remove it. Corresponds to [`liveblocks.editCommentMetadata`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-metadata).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `thread_id` | `str` | Yes | ID of the thread |
| `comment_id` | `str` | Yes | ID of the comment |
| `body` | `EditCommentMetadataRequestBody` | Yes | Request body (application/json) |


---

### Auth

#### authorize_user

This endpoint lets your application server (your back end) obtain a token that one of its clients (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own application’s custom authentication endpoint. When making this request, you’ll have to use your secret key.

**Important:** The difference with an [ID token](#post-identify-user) is that an access token holds all the permissions, and is the source of truth. With ID tokens, permissions are set in the Liveblocks back end (through REST API calls) and "checked at the door" every time they are used to enter a room.

**Note:** When using the `@liveblocks/node` package, you can use [`Liveblocks.prepareSession`](https://liveblocks.io/docs/api-reference/liveblocks-node#access-tokens) in your back end to build this request.

You can pass the property `userId` in the request’s body. This can be whatever internal identifier you use for your user accounts as long as it uniquely identifies an account. The property `userId` is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId` corresponds to one MAU.

Additionally, you can set custom metadata to the token, which will be publicly accessible by other clients through the `user.info` property. This is useful for storing static data like avatar images or the user’s display name.

Lastly, you’ll specify the exact permissions to give to the user using the `permissions` field. This is done in an object where the keys are room names, or room name patterns (ending in a `*`), and a list of permissions to assign the user for any room that matches that name exactly (or starts with the pattern’s prefix). For tips, see [Manage permissions with access tokens](https://liveblocks.io/docs/authentication/access-token).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `AuthorizeUserRequestBody` | Yes | Request body (application/json) |


---

#### identify_user

This endpoint lets your application server (your back end) obtain a token that one of its clients (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own application’s custom authentication endpoint. When using this endpoint to obtain ID tokens, you should manage your permissions by assigning user and/or group permissions to rooms explicitly, see our [Manage permissions with ID tokens](https://liveblocks.io/docs/authentication/id-token) section.

**Important:** The difference with an [access token](#post-authorize-user) is that an ID token doesn’t hold any permissions itself. With ID tokens, permissions are set in the Liveblocks back end (through REST API calls) and "checked at the door" every time they are used to enter a room. With access tokens, all permissions are set in the token itself, and thus controlled from your back end entirely.

**Note:** When using the `@liveblocks/node` package, you can use [`Liveblocks.identifyUser`](https://liveblocks.io/docs/api-reference/liveblocks-node) in your back end to build this request.

You can pass the property `userId` in the request’s body. This can be whatever internal identifier you use for your user accounts as long as it uniquely identifies an account. The property `userId` is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId` corresponds to one MAU.

If you want to use group permissions, you can also declare which `groupIds` this user belongs to. The group ID values are yours, but they will have to match the group IDs you assign permissions to when assigning permissions to rooms, see [Manage permissions with ID tokens](https://liveblocks.io/docs/authentication/id-token)).

Additionally, you can set custom metadata to the token, which will be publicly accessible by other clients through the `user.info` property. This is useful for storing static data like avatar images or the user’s display name.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `IdentifyUserRequestBody` | Yes | Request body (application/json) |


---

### Notifications

#### get_inbox_notification

This endpoint returns a user’s inbox notification by its ID. Corresponds to [`liveblocks.getInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-users-userId-inboxNotifications-inboxNotificationId).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |
| `inbox_notification_id` | `str` | Yes | ID of the inbox notification |


---

#### delete_inbox_notification

This endpoint deletes a user’s inbox notification by its ID. Corresponds to [`liveblocks.deleteInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-users-userId-inbox-notifications-inboxNotificationId).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |
| `inbox_notification_id` | `str` | Yes | ID of the inbox notification |


---

#### get_inbox_notifications

This endpoint returns all the user’s inbox notifications. Corresponds to [`liveblocks.getInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-users-userId-inboxNotifications).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |
| `organization_id` | `str \| Unset` | No | The organization ID to filter notifications for. |
| `query` | `str \| Unset` | No | Query to filter notifications. You can filter by `unread`, for example, `unread:true`. |
| `limit` | `int \| Unset` | No | A limit on the number of inbox notifications to be returned. The limit can range between 1 and 50, and defaults to 50. *(default: `50`)* |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

#### delete_all_inbox_notifications

This endpoint deletes all the user’s inbox notifications. Corresponds to [`liveblocks.deleteAllInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-users-userId-inbox-notifications).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |


---

#### get_notification_settings

This endpoint returns a user's notification settings for the project. Corresponds to [`liveblocks.getNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-users-userId-notification-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |


---

#### update_notification_settings

This endpoint updates a user's notification settings for the project. Corresponds to [`liveblocks.updateNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-users-userId-notification-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |
| `body` | `UpdateNotificationSettingsRequestBody` | Yes | Request body (application/json) |


---

#### delete_notification_settings

This endpoint deletes a user's notification settings for the project. Corresponds to [`liveblocks.deleteNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-users-userId-notification-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |


---

#### get_room_subscription_settings

This endpoint returns a user’s subscription settings for a specific room. Corresponds to [`liveblocks.getRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-users-userId-subscription-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `user_id` | `str` | Yes | ID of the user |


---

#### update_room_subscription_settings

This endpoint updates a user’s subscription settings for a specific room. Corresponds to [`liveblocks.updateRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-users-userId-subscription-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `user_id` | `str` | Yes | ID of the user |
| `body` | `UpdateRoomSubscriptionSettingsRequestBody` | Yes | Request body (application/json) |


---

#### delete_room_subscription_settings

This endpoint deletes a user’s subscription settings for a specific room. Corresponds to [`liveblocks.deleteRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-roomId-users-userId-subscription-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `user_id` | `str` | Yes | ID of the user |


---

#### get_user_room_subscription_settings

This endpoint returns the list of a user's room subscription settings. Corresponds to [`liveblocks.getUserRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-users-userId-room-subscription-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | ID of the user |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |
| `limit` | `int \| Unset` | No | A limit on the number of elements to be returned. The limit can range between 1 and 50, and defaults to 50. *(default: `50`)* |
| `organization_id` | `str \| Unset` | No | The organization ID to filter room subscription settings for. |


---

#### get_room_notification_settings

**Deprecated.** Renamed to [`/subscription-settings`](get-room-subscription-settings). Read more in our [migration guide](https://liveblocks.io/docs/platform/upgrading/2.24).

This endpoint returns a user’s subscription settings for a specific room. Corresponds to [`liveblocks.getRoomNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-users-userId-notification-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `user_id` | `str` | Yes | ID of the user |


---

#### update_room_notification_settings

**Deprecated.** Renamed to [`/subscription-settings`](update-room-subscription-settings). Read more in our [migration guide](https://liveblocks.io/docs/platform/upgrading/2.24).

This endpoint updates a user’s notification settings for a specific room. Corresponds to [`liveblocks.updateRoomNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-users-userId-notification-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `user_id` | `str` | Yes | ID of the user |
| `body` | `UpdateRoomSubscriptionSettingsRequestBody \| Unset` | No | Request body (application/json) |


---

#### delete_room_notification_settings

**Deprecated.** Renamed to [`/subscription-settings`](delete-room-subscription-settings). Read more in our [migration guide](https://liveblocks.io/docs/platform/upgrading/2.24).

This endpoint deletes a user’s notification settings for a specific room. Corresponds to [`liveblocks.deleteRoomNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-roomId-users-userId-notification-settings).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `room_id` | `str` | Yes | ID of the room |
| `user_id` | `str` | Yes | ID of the user |


---

#### trigger_inbox_notification

This endpoint triggers an inbox notification. Corresponds to [`liveblocks.triggerInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-inbox-notifications-trigger).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `TriggerInboxNotificationRequestBody \| Unset` | No | Request body (application/json) |


---

### Groups

#### get_groups

This endpoint returns a list of all groups in your project. Corresponds to [`liveblocks.getGroups`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-groups).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No | A limit on the number of groups to be returned. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

#### create_group

This endpoint creates a new group. Corresponds to [`liveblocks.createGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-group).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `CreateGroupRequestBody \| Unset` | No | Request body (application/json) |


---

#### get_group

This endpoint returns a specific group by ID. Corresponds to [`liveblocks.getGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-group).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes | The ID of the group to retrieve. |


---

#### delete_group

This endpoint deletes a group. Corresponds to [`liveblocks.deleteGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-group).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes | The ID of the group to delete. |


---

#### add_group_members

This endpoint adds new members to an existing group. Corresponds to [`liveblocks.addGroupMembers`](https://liveblocks.io/docs/api-reference/liveblocks-node#add-group-members).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes | The ID of the group to add members to. |
| `body` | `AddGroupMembersRequestBody` | Yes | Request body (application/json) |


---

#### remove_group_members

This endpoint removes members from an existing group. Corresponds to [`liveblocks.removeGroupMembers`](https://liveblocks.io/docs/api-reference/liveblocks-node#remove-group-members).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `str` | Yes | The ID of the group to remove members from. |
| `body` | `RemoveGroupMembersRequestBody` | Yes | Request body (application/json) |


---

#### get_user_groups

This endpoint returns all groups that a specific user is a member of. Corresponds to [`liveblocks.getUserGroups`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-user-groups).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `user_id` | `str` | Yes | The ID of the user to get groups for. |
| `limit` | `int \| Unset` | No | A limit on the number of groups to be returned. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

### Ai

#### get_ai_copilots

This endpoint returns a paginated list of AI copilots. The copilots are returned sorted by creation date, from newest to oldest. Corresponds to [`liveblocks.getAiCopilots`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-ai-copilots).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No | A limit on the number of copilots to be returned. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

#### create_ai_copilot

This endpoint creates a new AI copilot with the given configuration. Corresponds to [`liveblocks.createAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-ai-copilot).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `CreateAiCopilotOptionsAnthropic \| CreateAiCopilotOptionsGoogle \| CreateAiCopilotOptionsOpenAi \| CreateAiCopilotOptionsOpenAiCompatible` | Yes | Request body (application/json) |


---

#### get_ai_copilot

This endpoint returns an AI copilot by its ID. Corresponds to [`liveblocks.getAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-ai-copilot).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |


---

#### update_ai_copilot

This endpoint updates an existing AI copilot's configuration. Corresponds to [`liveblocks.updateAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#update-ai-copilot).

This endpoint returns a 422 response if the update doesn't apply due to validation failures. For example, if the existing copilot uses the "openai" provider and you attempt to update the provider model to an incompatible value for the provider, like "gemini-2.5-pro", you'll receive a 422 response with an error message explaining where the validation failed.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `body` | `UpdateAiCopilotRequestBody` | Yes | Request body (application/json) |


---

#### delete_ai_copilot

This endpoint deletes an AI copilot by its ID. A deleted copilot is no longer accessible and cannot be restored. Corresponds to [`liveblocks.deleteAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-ai-copilot).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |


---

#### get_knowledge_sources

This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds to [`liveblocks.getKnowledgeSources`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-knowledge-sources).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `limit` | `int \| Unset` | No | A limit on the number of knowledge sources to be returned. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

#### get_knowledge_source

This endpoint returns a specific knowledge source by its ID. Corresponds to [`liveblocks.getKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-knowledge-source).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `knowledge_source_id` | `str` | Yes | ID of the knowledge source |


---

#### create_web_knowledge_source

This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access and learn from web content. Corresponds to [`liveblocks.createWebKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-web-knowledge-source).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `body` | `CreateWebKnowledgeSourceRequestBody` | Yes | Request body (application/json) |


---

#### create_file_knowledge_source

This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can then reference the content of the file when responding. Corresponds to [`liveblocks.createFileKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-file-knowledge-source).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `name` | `str` | Yes | Name of the file |
| `body` | `File` | Yes | Request body (application/octet-stream) |


---

#### get_file_knowledge_source_markdown

This endpoint returns the content of a file knowledge source as markdown. This allows you to see what content the AI copilot has access to from uploaded files. Corresponds to [`liveblocks.getFileKnowledgeSourceMarkdown`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-file-knowledge-source-markdown).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `knowledge_source_id` | `str` | Yes | ID of the knowledge source |


---

#### delete_file_knowledge_source

This endpoint deletes a file knowledge source from an AI copilot. The copilot will no longer have access to the content from this file. Corresponds to [`liveblocks.deleteFileKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-file-knowledge-source).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `knowledge_source_id` | `str` | Yes | ID of the knowledge source |


---

#### delete_web_knowledge_source

This endpoint deletes a web knowledge source from an AI copilot. The copilot will no longer have access to the content from this source. Corresponds to [`liveblocks.deleteWebKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-web-knowledge-source).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `knowledge_source_id` | `str` | Yes | ID of the knowledge source |


---

#### get_web_knowledge_source_links

This endpoint returns a paginated list of links that were indexed from a web knowledge source. This is useful for understanding what content the AI copilot has access to from web sources. Corresponds to [`liveblocks.getWebKnowledgeSourceLinks`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-web-knowledge-source-links).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `copilot_id` | `str` | Yes | ID of the AI copilot |
| `knowledge_source_id` | `str` | Yes | ID of the knowledge source |
| `limit` | `int \| Unset` | No | A limit on the number of links to be returned. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `starting_after` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

### Management

#### get_management_projects

Returns a paginated list of projects. You can limit the number of projects returned per page and use the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | `int \| Unset` | No | A limit on the number of projects to return. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `cursor` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

#### create_management_project

Creates a new project within your account. This endpoint requires the `write:all` scope. You can specify the project type, name, and version creation timeout. Upon success, returns information about the newly created project, including its ID, keys, region, and settings.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `body` | `CreateManagementProjectRequestBody` | Yes | Request body (application/json) |


---

#### get_management_project

Returns a single project specified by its ID. This endpoint requires the `read:all` scope. If the project cannot be found, a 404 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |


---

#### update_management_project

Updates an existing project specified by its ID. This endpoint allows you to modify project details such as the project name and the version creation timeout. The `versionCreationTimeout` can be set to `false` to disable the timeout or to a number of seconds between 30 and 300. Fields omitted from the request body will not be updated. Requires the `write:all` scope.

If the project cannot be found, a 404 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `body` | `UpdateManagementProjectRequestBody` | Yes | Request body (application/json) |


---

#### delete_management_project

Soft deletes the project specified by its ID. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |


---

#### activate_project_public_api_key

Activates the public API key associated with the specified project. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |


---

#### deactivate_project_public_api_key

Deactivates the public API key associated with the specified project. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |


---

#### roll_project_public_api_key

Rolls (rotates) the public API key associated with the specified project, generating a new key value while deprecating the previous one. The new key becomes immediately active. This endpoint requires the `write:all` scope.

If the public key is not currently enabled for the project, a 403 error response is returned. If the project cannot be found, a 404 error response is returned. An optional `expirationIn` parameter can be provided in the request body to set when the previous key should expire.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `body` | `RollProjectPublicApiKeyRequestBody \| Unset` | No | Request body (application/json) |


---

#### roll_project_secret_api_key

Rolls (rotates) the secret API key associated with the specified project, generating a new key value while deprecating the previous one. The new key becomes immediately active. This endpoint requires the `write:all` scope.

If the project cannot be found, a 404 error response is returned. An optional `expirationIn` parameter can be provided in the request body to set when the previous key should expire.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `body` | `RollProjectSecretApiKeyRequestBody \| Unset` | No | Request body (application/json) |


---

#### get_management_webhooks

Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The response includes an array of webhook objects associated with the specified project, as well as a `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter from the `nextCursor` value in the previous response to fetch subsequent pages. If the project cannot be found, a 404 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `limit` | `int \| Unset` | No | A limit on the number of webhooks to return. The limit can range between 1 and 100, and defaults to 20. *(default: `20`)* |
| `cursor` | `str \| Unset` | No | A cursor used for pagination. Get the value from the `nextCursor` response of the previous page. |


---

#### create_management_webhook

Creates a new webhook for a project. This endpoint requires the `write:all` scope. If the project cannot be found, a 404 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `body` | `CreateManagementWebhookRequestBody` | Yes | Request body (application/json) |


---

#### get_management_webhook

Get one webhook by `webhookId` for a project. Returns webhook settings such as URL, subscribed events, disabled state, throttling, and additional headers. Returns `404` if the project or webhook does not exist. This endpoint requires the `read:all` scope.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |


---

#### update_management_webhook

Update one webhook by `webhookId` for a project. Send only fields you want to change; omitted fields stay unchanged. Returns `404` if the project or webhook does not exist and `422` for validation errors. This endpoint requires the `write:all` scope.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |
| `body` | `UpdateManagementWebhookRequestBody` | Yes | Request body (application/json) |


---

#### delete_management_webhook

Delete one webhook by `webhookId` for a project. Returns `200` with an empty body on success, or `404` if the project or webhook does not exist. Requires `write:all`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |


---

#### roll_management_webhook_secret

Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24 hours. Returns `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |


---

#### get_management_webhook_additional_headers

Get a webhook's additional headers. Returns `404` if the project or webhook does not exist. Requires `read:all`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |


---

#### upsert_management_webhook_additional_headers

Upsert additional headers for a webhook. Provided headers are merged with existing headers, and existing values are overwritten when names match. Returns updated headers, or `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |
| `body` | `UpsertManagementWebhookHeadersRequestBody` | Yes | Request body (application/json) |


---

#### delete_management_webhook_additional_headers

Remove selected additional headers from a webhook. Send header names in `headers` field; other headers are unchanged. Returns updated headers, or `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope. At least one header name must be provided; otherwise, a 422 error response is returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |
| `body` | `DeleteManagementWebhookHeadersRequestBody` | Yes | Request body (application/json) |


---

#### recover_failed_webhook_messages

Requeue failed deliveries for a webhook from the given `since` timestamp. Returns `200` with an empty body when recovery starts, an `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |
| `body` | `RecoverManagementWebhookFailedMessagesRequestBody` | Yes | Request body (application/json) |


---

#### send_test_webhook

Send a test event to a webhook and return the created message metadata. `subscribedEvent` must be one of the webhook's subscribed events, otherwise the endpoint returns `422`. Returns `404` if the project or webhook does not exist. This endpoint requires the `write:all` scope.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | `str` | Yes | ID of the project |
| `webhook_id` | `str` | Yes | ID of the webhook |
| `body` | `TestManagementWebhookRequestBody` | Yes | Request body (application/json) |


---


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