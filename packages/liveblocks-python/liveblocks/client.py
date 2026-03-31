from __future__ import annotations

import re
from typing import TYPE_CHECKING, Any

import httpx

from .types import UNSET, File, Unset

if TYPE_CHECKING:
    from .models.active_users_response import ActiveUsersResponse
    from .models.add_comment_reaction_request_body import AddCommentReactionRequestBody
    from .models.add_group_members_request_body import AddGroupMembersRequestBody
    from .models.add_json_patch_operation import AddJsonPatchOperation
    from .models.ai_copilot_anthropic import AiCopilotAnthropic
    from .models.ai_copilot_google import AiCopilotGoogle
    from .models.ai_copilot_open_ai import AiCopilotOpenAi
    from .models.ai_copilot_open_ai_compatible import AiCopilotOpenAiCompatible
    from .models.attachment_with_url import AttachmentWithUrl
    from .models.authorize_user_request_body import AuthorizeUserRequestBody
    from .models.authorize_user_response import AuthorizeUserResponse
    from .models.comment import Comment
    from .models.comment_metadata import CommentMetadata
    from .models.comment_reaction import CommentReaction
    from .models.copy_json_patch_operation import CopyJsonPatchOperation
    from .models.create_ai_copilot_options_anthropic import CreateAiCopilotOptionsAnthropic
    from .models.create_ai_copilot_options_google import CreateAiCopilotOptionsGoogle
    from .models.create_ai_copilot_options_open_ai import CreateAiCopilotOptionsOpenAi
    from .models.create_ai_copilot_options_open_ai_compatible import CreateAiCopilotOptionsOpenAiCompatible
    from .models.create_comment_request_body import CreateCommentRequestBody
    from .models.create_feed_message_request_body import CreateFeedMessageRequestBody
    from .models.create_feed_request_body import CreateFeedRequestBody
    from .models.create_file_knowledge_source_response import CreateFileKnowledgeSourceResponse
    from .models.create_group_request_body import CreateGroupRequestBody
    from .models.create_room_request_body import CreateRoomRequestBody
    from .models.create_thread_request_body import CreateThreadRequestBody
    from .models.create_web_knowledge_source_request_body import CreateWebKnowledgeSourceRequestBody
    from .models.create_web_knowledge_source_response import CreateWebKnowledgeSourceResponse
    from .models.create_yjs_version_response import CreateYjsVersionResponse
    from .models.edit_comment_metadata_request_body import EditCommentMetadataRequestBody
    from .models.edit_comment_request_body import EditCommentRequestBody
    from .models.edit_thread_metadata_request_body import EditThreadMetadataRequestBody
    from .models.feed import Feed
    from .models.feed_message import FeedMessage
    from .models.get_ai_copilots_response import GetAiCopilotsResponse
    from .models.get_feed_messages_response import GetFeedMessagesResponse
    from .models.get_feeds_response import GetFeedsResponse
    from .models.get_file_knowledge_source_markdown_response import GetFileKnowledgeSourceMarkdownResponse
    from .models.get_groups_response import GetGroupsResponse
    from .models.get_inbox_notifications_response import GetInboxNotificationsResponse
    from .models.get_knowledge_sources_response import GetKnowledgeSourcesResponse
    from .models.get_room_subscription_settings_response import GetRoomSubscriptionSettingsResponse
    from .models.get_rooms_response import GetRoomsResponse
    from .models.get_storage_document_format import GetStorageDocumentFormat
    from .models.get_storage_document_response import GetStorageDocumentResponse
    from .models.get_thread_inbox_notifications_response import GetThreadInboxNotificationsResponse
    from .models.get_thread_subscriptions_response import GetThreadSubscriptionsResponse
    from .models.get_threads_response import GetThreadsResponse
    from .models.get_user_groups_response import GetUserGroupsResponse
    from .models.get_web_knowledge_source_links_response import GetWebKnowledgeSourceLinksResponse
    from .models.get_yjs_document_response import GetYjsDocumentResponse
    from .models.get_yjs_document_type import GetYjsDocumentType
    from .models.get_yjs_versions_response import GetYjsVersionsResponse
    from .models.group import Group
    from .models.identify_user_request_body import IdentifyUserRequestBody
    from .models.identify_user_response import IdentifyUserResponse
    from .models.inbox_notification_custom_data import InboxNotificationCustomData
    from .models.inbox_notification_thread_data import InboxNotificationThreadData
    from .models.initialize_storage_document_body import InitializeStorageDocumentBody
    from .models.initialize_storage_document_response import InitializeStorageDocumentResponse
    from .models.knowledge_source_file_source import KnowledgeSourceFileSource
    from .models.knowledge_source_web_source import KnowledgeSourceWebSource
    from .models.mark_thread_as_resolved_request_body import MarkThreadAsResolvedRequestBody
    from .models.mark_thread_as_unresolved_request_body import MarkThreadAsUnresolvedRequestBody
    from .models.move_json_patch_operation import MoveJsonPatchOperation
    from .models.notification_settings import NotificationSettings
    from .models.remove_comment_reaction_request_body import RemoveCommentReactionRequestBody
    from .models.remove_group_members_request_body import RemoveGroupMembersRequestBody
    from .models.remove_json_patch_operation import RemoveJsonPatchOperation
    from .models.replace_json_patch_operation import ReplaceJsonPatchOperation
    from .models.room import Room
    from .models.room_subscription_settings import RoomSubscriptionSettings
    from .models.set_presence_request_body import SetPresenceRequestBody
    from .models.subscribe_to_thread_request_body import SubscribeToThreadRequestBody
    from .models.subscription import Subscription
    from .models.test_json_patch_operation import TestJsonPatchOperation
    from .models.thread import Thread
    from .models.thread_metadata import ThreadMetadata
    from .models.trigger_inbox_notification_request_body import TriggerInboxNotificationRequestBody
    from .models.unsubscribe_from_thread_request_body import UnsubscribeFromThreadRequestBody
    from .models.update_ai_copilot_request_body import UpdateAiCopilotRequestBody
    from .models.update_feed_message_request_body import UpdateFeedMessageRequestBody
    from .models.update_feed_request_body import UpdateFeedRequestBody
    from .models.update_notification_settings_request_body import UpdateNotificationSettingsRequestBody
    from .models.update_room_id_request_body import UpdateRoomIdRequestBody
    from .models.update_room_organization_id_request_body import UpdateRoomOrganizationIdRequestBody
    from .models.update_room_request_body import UpdateRoomRequestBody
    from .models.update_room_subscription_settings_request_body import UpdateRoomSubscriptionSettingsRequestBody
    from .models.upsert_room_request_body import UpsertRoomRequestBody
    from .session import AsyncSession, Session

_DEFAULT_BASE_URL = "https://api.liveblocks.io"
_VALID_KEY_CHARS_REGEX = re.compile(r"^[\w-]+$")


def _assert_secret_key(value: str) -> None:
    if not value.startswith("sk_"):
        raise ValueError(
            "Invalid value for 'secret'. Secret keys must start with 'sk_'. "
            "Please provide the secret key from your Liveblocks dashboard at "
            "https://liveblocks.io/dashboard/apikeys."
        )
    if not _VALID_KEY_CHARS_REGEX.match(value):
        raise ValueError(
            "Invalid chars found in 'secret'. Please check that you correctly "
            "copied the secret key from your Liveblocks dashboard at "
            "https://liveblocks.io/dashboard/apikeys."
        )


class Liveblocks:
    """Synchronous client for the Liveblocks API.

    Args:
        secret: The Liveblocks secret key. Must start with ``sk_``.
            Get it from https://liveblocks.io/dashboard/apikeys
        base_url: Point the client to an alternative Liveblocks server.
    """

    _client: httpx.Client

    def __init__(self, *, secret: str, base_url: str | None = None) -> None:
        _assert_secret_key(secret)
        self._client = httpx.Client(
            base_url=base_url or _DEFAULT_BASE_URL,
            headers={"Authorization": f"Bearer {secret}"},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> Liveblocks:
        self._client.__enter__()
        return self

    def __exit__(self, *args: Any, **kwargs: Any) -> None:
        self._client.__exit__(*args, **kwargs)

    def prepare_session(
        self,
        user_id: str,
        user_info: dict[str, Any] | None = None,
        organization_id: str | None = None,
    ) -> Session:
        from .session import Session

        return Session(
            client=self,
            user_id=user_id,
            user_info=user_info,
            organization_id=organization_id,
        )

    def get_rooms(
        self,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        user_id: str | Unset = UNSET,
        group_ids: str | Unset = UNSET,
    ) -> GetRoomsResponse:
        """Get rooms

         This endpoint returns a list of your rooms. The rooms are returned sorted by creation date, from
        newest to oldest. You can filter rooms by room ID prefixes, metadata, users accesses, and groups
        accesses. Corresponds to [`liveblocks.getRooms`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#get-rooms).

        There is a pagination system where the cursor to the next page is returned in the response as
        `nextCursor`, which can be combined with `startingAfter`.
        You can also limit the number of rooms by query.

        Filtering by metadata works by giving key values like `metadata.color=red`. Of course you can
        combine multiple metadata clauses to refine the response like
        `metadata.color=red&metadata.type=text`. Notice here the operator AND is applied between each
        clauses.

        Filtering by groups or userId works by giving a list of groups like
        `groupIds=marketing,GZo7tQ,product` or/and a userId like `userId=user1`.
        Notice here the operator OR is applied between each `groupIds` and the `userId`.

        Args:
            limit (int | Unset): A limit on the number of rooms to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            organization_id (str | Unset): A filter on organization ID. Example: org_123456789.
            query (str | Unset): Query to filter rooms. You can filter by `roomId` and `metadata`, for
                example, `metadata["roomType"]:"whiteboard" AND roomId^"liveblocks:engineering"`. Learn
                more about [filtering rooms with query language](https://liveblocks.io/docs/guides/how-to-
                filter-rooms-using-query-language). Example: metadata["color"]:"blue".
            user_id (str | Unset): A filter on users accesses. Example: user-123.
            group_ids (str | Unset): A filter on groups accesses. Multiple groups can be used.
                Example: group1,group2.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetRoomsResponse
        """

        from .api.room import get_rooms

        return get_rooms._sync(
            limit=limit,
            starting_after=starting_after,
            organization_id=organization_id,
            query=query,
            user_id=user_id,
            group_ids=group_ids,
            client=self._client,
        )

    def create_room(
        self,
        *,
        body: CreateRoomRequestBody,
        idempotent: bool | Unset = UNSET,
    ) -> Room:
        r"""Create room

         This endpoint creates a new room. `id` and `defaultAccesses` are required. When provided with a
        `?idempotent` query argument, will not return a 409 when the room already exists, but instead return
        the existing room as-is. Corresponds to [`liveblocks.createRoom`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#post-rooms), or to
        [`liveblocks.getOrCreateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-or-
        create-rooms-roomId) when `?idempotent` is provided.
        - `defaultAccesses` could be `[]` or `[\"room:write\"]` (private or public).
        - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
        Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
        `metadata` is optional field.
        - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
        1000 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
        - `groupsAccesses` are optional fields.

        Args:
            idempotent (bool | Unset): When provided, will not return a 409 when the room already
                exists, but instead return the existing room as-is. Corresponds to
                [`liveblocks.getOrCreateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-
                node#get-or-create-rooms-roomId). Example: True.
            body (CreateRoomRequestBody):  Example: {'id': 'my-room-id', 'defaultAccesses':
                ['room:write'], 'metadata': {'color': 'blue'}, 'usersAccesses': {'alice': ['room:write']},
                'groupsAccesses': {'product': ['room:write']}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import create_room

        return create_room._sync(
            body=body,
            idempotent=idempotent,
            client=self._client,
        )

    def get_room(
        self,
        room_id: str,
    ) -> Room:
        """Get room

         This endpoint returns a room by its ID. Corresponds to
        [`liveblocks.getRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomid).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import get_room

        return get_room._sync(
            room_id=room_id,
            client=self._client,
        )

    def update_room(
        self,
        room_id: str,
        *,
        body: UpdateRoomRequestBody,
    ) -> Room:
        r"""Update room

         This endpoint updates specific properties of a room. Corresponds to
        [`liveblocks.updateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomid).

        It’s not necessary to provide the entire room’s information.
        Setting a property to `null` means to delete this property. For example, if you want to remove
        access to a specific user without losing other users:
        ``{
            \"usersAccesses\": {
                \"john\": null
            }
        }``
        `defaultAccesses`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

        - `defaultAccesses` could be `[]` or `[\"room:write\"]` (private or public).
        - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
        Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
        `metadata` is optional field.
        - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
        1000 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
        - `groupsAccesses` could be `[]` or `[\"room:write\"]` for every records. `groupsAccesses` can
        contain 1000 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional
        field.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (UpdateRoomRequestBody):  Example: {'defaultAccesses': ['room:write'],
                'usersAccesses': {'alice': ['room:write']}, 'groupsAccesses': {'marketing':
                ['room:write']}, 'metadata': {'color': 'blue'}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import update_room

        return update_room._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def delete_room(
        self,
        room_id: str,
    ) -> None:
        """Delete room

         This endpoint deletes a room. A deleted room is no longer accessible from the API or the dashboard
        and it cannot be restored. Corresponds to [`liveblocks.deleteRoom`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#delete-rooms-roomid).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import delete_room

        return delete_room._sync(
            room_id=room_id,
            client=self._client,
        )

    def prewarm_room(
        self,
        room_id: str,
    ) -> None:
        """Prewarm room

         Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
        connecting to a room with [`RoomProvider`](https://liveblocks.io/docs/api-reference/liveblocks-
        react#RoomProvider) or [`enterRoom`](https://liveblocks.io/docs/api-reference/liveblocks-
        client#Client.enterRoom) within 10 seconds, and the room will load quicker. Corresponds to
        [`liveblocks.prewarmRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomid-prewarm).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import prewarm_room

        return prewarm_room._sync(
            room_id=room_id,
            client=self._client,
        )

    def upsert_room(
        self,
        room_id: str,
        *,
        body: UpsertRoomRequestBody,
    ) -> Room:
        r"""Upsert (update or create) room

         This endpoint updates specific properties of a room. Corresponds to
        [`liveblocks.upsertRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#upsert-rooms-
        roomId).

        It’s not necessary to provide the entire room’s information.
        Setting a property to `null` means to delete this property. For example, if you want to remove
        access to a specific user without losing other users:
        ``{
            \"usersAccesses\": {
                \"john\": null
            }
        }``
        `defaultAccesses`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

        - `defaultAccesses` could be `[]` or `[\"room:write\"]` (private or public).
        - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
        Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
        `metadata` is optional field.
        - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
        1000 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
        - `groupsAccesses` could be `[]` or `[\"room:write\"]` for every records. `groupsAccesses` can
        contain 1000 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional
        field.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (UpsertRoomRequestBody):  Example: {'update': {'usersAccesses': {'alice':
                ['room:write']}, 'groupsAccesses': {'marketing': ['room:write']}, 'metadata': {'color':
                'blue'}}, 'create': {'defaultAccesses': ['room:write']}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import upsert_room

        return upsert_room._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def update_room_id(
        self,
        room_id: str,
        *,
        body: UpdateRoomIdRequestBody,
    ) -> Room:
        """Update room ID

         This endpoint permanently updates the room’s ID. All existing references to the old room ID will
        need to be updated. Returns the updated room. Corresponds to
        [`liveblocks.updateRoomId`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomid-update-room-id).

        Args:
            room_id (str): The new ID for the room Example: my-room-id.
            body (UpdateRoomIdRequestBody):  Example: {'newRoomId': 'new-room-id'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import update_room_id

        return update_room_id._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def update_room_organization_id(
        self,
        room_id: str,
        *,
        body: UpdateRoomOrganizationIdRequestBody,
    ) -> Room:
        """Update room organization ID

         This endpoint updates the room's organization ID. The `fromOrganizationId` must match the room's
        current organization ID. Returns the updated room.

        Args:
            room_id (str): The ID of the room Example: my-room-id.
            body (UpdateRoomOrganizationIdRequestBody):  Example: {'fromOrganizationId':
                'org_123456789', 'toOrganizationId': 'org_987654321'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import update_room_organization_id

        return update_room_organization_id._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_active_users(
        self,
        room_id: str,
    ) -> ActiveUsersResponse:
        """Get active users

         This endpoint returns a list of users currently present in the requested room. Corresponds to
        [`liveblocks.getActiveUsers`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomid-active-users).

        For optimal performance, we recommend calling this endpoint no more than once every 10 seconds.
        Duplicates can occur if a user is in the requested room with multiple browser tabs opened.

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            ActiveUsersResponse
        """

        from .api.room import get_active_users

        return get_active_users._sync(
            room_id=room_id,
            client=self._client,
        )

    def set_presence(
        self,
        room_id: str,
        *,
        body: SetPresenceRequestBody,
    ) -> None:
        """Set ephemeral presence

         This endpoint sets ephemeral presence for a user in a room without requiring a WebSocket connection.
        The presence data will automatically expire after the specified TTL (time-to-live). This is useful
        for scenarios like showing an AI agent's presence in a room. The presence will be broadcast to all
        connected users in the room. Corresponds to
        [`liveblocks.setPresence`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-presence).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (SetPresenceRequestBody):  Example: {'userId': 'agent-123', 'data': {'status':
                'active', 'cursor': {'x': 100, 'y': 200}}, 'userInfo': {'name': 'AI Assistant', 'avatar':
                'https://example.org/images/agent123.jpg'}, 'ttl': 60}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import set_presence

        return set_presence._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def broadcast_event(
        self,
        room_id: str,
        *,
        body: Any,
    ) -> None:
        """Broadcast event to a room

         This endpoint enables the broadcast of an event to a room without having to connect to it via the
        `client` from `@liveblocks/client`. It takes any valid JSON as a request body. The `connectionId`
        passed to event listeners is `-1` when using this API. Corresponds to
        [`liveblocks.broadcastEvent`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        broadcast-event).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (Any):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import broadcast_event

        return broadcast_event._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_storage_document(
        self,
        room_id: str,
        *,
        format_: GetStorageDocumentFormat | Unset = UNSET,
    ) -> GetStorageDocumentResponse:
        r"""Get Storage document

         Returns the contents of the room’s Storage tree. Corresponds to
        [`liveblocks.getStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        rooms-roomId-storage).

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
            room_id (str): ID of the room Example: my-room-id.
            format_ (GetStorageDocumentFormat | Unset): Use the `json` format to output a simplified
                JSON representation of the Storage tree. In that format, each LiveObject and LiveMap will
                be formatted as a simple JSON object, and each LiveList will be formatted as a simple JSON
                array. This is a lossy format because information about the original data structures is
                not retained, but it may be easier to work with. Example: json.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetStorageDocumentResponse
        """

        from .api.storage import get_storage_document

        return get_storage_document._sync(
            room_id=room_id,
            format_=format_,
            client=self._client,
        )

    def initialize_storage_document(
        self,
        room_id: str,
        *,
        body: InitializeStorageDocumentBody,
    ) -> InitializeStorageDocumentResponse:
        r"""Initialize Storage document

         This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling
        this endpoint will disconnect all users from the room if there are any, triggering a reconnect.
        Corresponds to [`liveblocks.initializeStorageDocument`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#post-rooms-roomId-storage).

        The format of the request body is the same as what’s returned by the get Storage endpoint.

        For each Liveblocks data structure that you want to create, you need a JSON element having two
        properties:
        - `\"liveblocksType\"` => `\"LiveObject\" | \"LiveList\" | \"LiveMap\"`
        - `\"data\"` => contains the nested data structures (children) and data.

        The root’s type can only be LiveObject.

        A utility function, `toPlainLson` is included in `@liveblocks/client` from `1.0.9` to help convert
        `LiveObject`, `LiveList`, and `LiveMap` to the structure expected by the endpoint.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (InitializeStorageDocumentBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            InitializeStorageDocumentResponse
        """

        from .api.storage import initialize_storage_document

        return initialize_storage_document._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def delete_storage_document(
        self,
        room_id: str,
    ) -> None:
        """Delete Storage document

         This endpoint deletes all of the room’s Storage data. Calling this endpoint will disconnect all
        users from the room if there are any. Corresponds to
        [`liveblocks.deleteStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-rooms-roomId-storage).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.storage import delete_storage_document

        return delete_storage_document._sync(
            room_id=room_id,
            client=self._client,
        )

    def patch_storage_document(
        self,
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
        Patch](https://liveblocks.io/docs/guides/modifying-storage-via-rest-api-with-json-patch).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (list[AddJsonPatchOperation | CopyJsonPatchOperation | MoveJsonPatchOperation |
                RemoveJsonPatchOperation | ReplaceJsonPatchOperation | TestJsonPatchOperation]):  Example:
                [{'op': 'add', 'path': '/score', 'value': 42}, {'op': 'remove', 'path': '/oldKey'}].

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.storage import patch_storage_document

        return patch_storage_document._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_yjs_document(
        self,
        room_id: str,
        *,
        formatting: bool | Unset = UNSET,
        key: str | Unset = UNSET,
        type_: GetYjsDocumentType | Unset = UNSET,
    ) -> GetYjsDocumentResponse:
        """Get Yjs document

         This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
        [`liveblocks.getYjsDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomId-ydoc).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            formatting (bool | Unset): If present, YText will return formatting.
            key (str | Unset): Returns only a single key’s value, e.g. `doc.get(key).toJSON()`.
                Example: root.
            type_ (GetYjsDocumentType | Unset): Used with key to override the inferred type, i.e.
                `"ymap"` will return `doc.get(key, Y.Map)`. Example: ymap.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetYjsDocumentResponse
        """

        from .api.yjs import get_yjs_document

        return get_yjs_document._sync(
            room_id=room_id,
            formatting=formatting,
            key=key,
            type_=type_,
            client=self._client,
        )

    def send_yjs_binary_update(
        self,
        room_id: str,
        *,
        body: File,
        guid: str | Unset = UNSET,
    ) -> None:
        """Send a binary Yjs update

         This endpoint is used to send a Yjs binary update to the room’s Yjs document. You can use this
        endpoint to initialize Yjs data for the room or to update the room’s Yjs document. To send an update
        to a subdocument instead of the main document, pass its `guid`. Corresponds to
        [`liveblocks.sendYjsBinaryUpdate`](https://liveblocks.io/docs/api-reference/liveblocks-node#put-
        rooms-roomId-ydoc).

        The update is typically obtained by calling `Y.encodeStateAsUpdate(doc)`. See the [Yjs
        documentation](https://docs.yjs.dev/api/document-updates) for more details. When manually making
        this HTTP call, set the HTTP header `Content-Type` to `application/octet-stream`, and send the
        binary update (a `Uint8Array`) in the body of the HTTP request. This endpoint does not accept JSON,
        unlike most other endpoints.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            guid (str | Unset): ID of the subdocument Example: subdoc-guid-123.
            body (File):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.yjs import send_yjs_binary_update

        return send_yjs_binary_update._sync(
            room_id=room_id,
            body=body,
            guid=guid,
            client=self._client,
        )

    def get_yjs_document_as_binary_update(
        self,
        room_id: str,
        *,
        guid: str | Unset = UNSET,
    ) -> File:
        """Get Yjs document encoded as a binary Yjs update

         This endpoint returns the room's Yjs document encoded as a single binary update. This can be used by
        `Y.applyUpdate(responseBody)` to get a copy of the document in your back end. See [Yjs
        documentation](https://docs.yjs.dev/api/document-updates) for more information on working with
        updates. To return a subdocument instead of the main document, pass its `guid`. Corresponds to
        [`liveblocks.getYjsDocumentAsBinaryUpdate`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-rooms-roomId-ydoc-binary).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            guid (str | Unset): ID of the subdocument Example: subdoc-guid-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            File
        """

        from .api.yjs import get_yjs_document_as_binary_update

        return get_yjs_document_as_binary_update._sync(
            room_id=room_id,
            guid=guid,
            client=self._client,
        )

    def get_yjs_versions(
        self,
        room_id: str,
        *,
        limit: int | Unset = 20,
        cursor: str | Unset = UNSET,
    ) -> GetYjsVersionsResponse:
        """Get Yjs version history

         This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
        are returned sorted by creation date, from newest to oldest.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            limit (int | Unset): A limit on the number of versions to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            cursor (str | Unset): A cursor used for pagination. Get the value from the `nextCursor`
                response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetYjsVersionsResponse
        """

        from .api.yjs import get_yjs_versions

        return get_yjs_versions._sync(
            room_id=room_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    def get_yjs_version(
        self,
        room_id: str,
        version_id: str,
    ) -> File:
        """Get Yjs document version

         This endpoint returns a specific version of the room's Yjs document encoded as a binary Yjs update.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            version_id (str): ID of the version Example: vh_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            File
        """

        from .api.yjs import get_yjs_version

        return get_yjs_version._sync(
            room_id=room_id,
            version_id=version_id,
            client=self._client,
        )

    def create_yjs_version(
        self,
        room_id: str,
    ) -> CreateYjsVersionResponse:
        """Create Yjs version snapshot

         This endpoint creates a new version history snapshot for the room's Yjs document.

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CreateYjsVersionResponse
        """

        from .api.yjs import create_yjs_version

        return create_yjs_version._sync(
            room_id=room_id,
            client=self._client,
        )

    def get_threads(
        self,
        room_id: str,
        *,
        query: str | Unset = UNSET,
    ) -> GetThreadsResponse:
        """Get room threads

         This endpoint returns the threads in the requested room. Corresponds to
        [`liveblocks.getThreads`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        threads).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            query (str | Unset): Query to filter threads. You can filter by `metadata` and `resolved`,
                for example, `metadata["status"]:"open" AND metadata["color"]:"red" AND resolved:true`.
                Learn more about [filtering threads with query
                language](https://liveblocks.io/docs/guides/how-to-filter-threads-using-query-language).
                Example: metadata["color"]:"blue".

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetThreadsResponse
        """

        from .api.comments import get_threads

        return get_threads._sync(
            room_id=room_id,
            query=query,
            client=self._client,
        )

    def create_thread(
        self,
        room_id: str,
        *,
        body: CreateThreadRequestBody,
    ) -> Thread:
        r"""Create thread

         This endpoint creates a new thread and the first comment in the thread. Corresponds to
        [`liveblocks.createThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads).

        A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
        construct a comment’s body, which can be submitted under `comment.body`.

        ```json
        {
          \"version\": 1,
          \"content\": [
            {
              \"type\": \"paragraph\",
              \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
            }
          ]
        }
        ```

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (CreateThreadRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import create_thread

        return create_thread._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_thread(
        self,
        room_id: str,
        thread_id: str,
    ) -> Thread:
        """Get thread

         This endpoint returns a thread by its ID. Corresponds to
        [`liveblocks.getThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        threads-threadId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import get_thread

        return get_thread._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def delete_thread(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        """Delete thread

         This endpoint deletes a thread by its ID. Corresponds to
        [`liveblocks.deleteThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-
        roomId-threads-threadId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import delete_thread

        return delete_thread._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def edit_thread_metadata(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: EditThreadMetadataRequestBody,
    ) -> ThreadMetadata:
        """Edit thread metadata

         This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
        store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
        property to `null` to remove it. Corresponds to
        [`liveblocks.editThreadMetadata`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-metadata).

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (EditThreadMetadataRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            ThreadMetadata
        """

        from .api.comments import edit_thread_metadata

        return edit_thread_metadata._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def mark_thread_as_resolved(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: MarkThreadAsResolvedRequestBody,
    ) -> Thread:
        """Mark thread as resolved

         This endpoint marks a thread as resolved. The request body must include a `userId` to identify who
        resolved the thread. Returns the updated thread. Corresponds to
        [`liveblocks.markThreadAsResolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-mark-as-resolved).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (MarkThreadAsResolvedRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import mark_thread_as_resolved

        return mark_thread_as_resolved._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def mark_thread_as_unresolved(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: MarkThreadAsUnresolvedRequestBody,
    ) -> Thread:
        """Mark thread as unresolved

         This endpoint marks a thread as unresolved. The request body must include a `userId` to identify who
        unresolved the thread. Returns the updated thread. Corresponds to
        [`liveblocks.markThreadAsUnresolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-mark-as-unresolved).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (MarkThreadAsUnresolvedRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import mark_thread_as_unresolved

        return mark_thread_as_unresolved._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def subscribe_to_thread(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: SubscribeToThreadRequestBody,
    ) -> Subscription:
        """Subscribe to thread

         This endpoint subscribes to a thread. Corresponds to
        [`liveblocks.subscribeToThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-subscribe).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (SubscribeToThreadRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Subscription
        """

        from .api.comments import subscribe_to_thread

        return subscribe_to_thread._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def unsubscribe_from_thread(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: UnsubscribeFromThreadRequestBody,
    ) -> None:
        """Unsubscribe from thread

         This endpoint unsubscribes from a thread. Corresponds to
        [`liveblocks.unsubscribeFromThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-unsubscribe).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (UnsubscribeFromThreadRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import unsubscribe_from_thread

        return unsubscribe_from_thread._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def get_thread_subscriptions(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetThreadSubscriptionsResponse:
        """Get thread subscriptions

         This endpoint gets the list of subscriptions to a thread. Corresponds to
        [`liveblocks.getThreadSubscriptions`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        rooms-roomId-threads-threadId-subscriptions).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetThreadSubscriptionsResponse
        """

        from .api.comments import get_thread_subscriptions

        return get_thread_subscriptions._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def create_comment(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: CreateCommentRequestBody,
    ) -> Comment:
        r"""Create comment

         This endpoint creates a new comment, adding it as a reply to a thread. Corresponds to
        [`liveblocks.createComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads-threadId-comments).

        A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
        construct a comment’s body, which can be submitted under `body`.

        ```json
        {
          \"version\": 1,
          \"content\": [
            {
              \"type\": \"paragraph\",
              \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
            }
          ]
        }
        ```

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (CreateCommentRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Comment
        """

        from .api.comments import create_comment

        return create_comment._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def get_comment(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> Comment:
        """Get comment

         This endpoint returns a comment by its ID. Corresponds to
        [`liveblocks.getComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        threads-threadId-comments-commentId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Comment
        """

        from .api.comments import get_comment

        return get_comment._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    def edit_comment(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: EditCommentRequestBody,
    ) -> Comment:
        r"""Edit comment

         This endpoint edits the specified comment. Corresponds to
        [`liveblocks.editComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads-threadId-comments-commentId).

        A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
        construct a comment’s body, which can be submitted under `body`.

        ```json
        {
          \"version\": 1,
          \"content\": [
            {
              \"type\": \"paragraph\",
              \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
            }
          ]
        }
        ```

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (EditCommentRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Comment
        """

        from .api.comments import edit_comment

        return edit_comment._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def delete_comment(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> None:
        """Delete comment

         This endpoint deletes a comment. A deleted comment is no longer accessible from the API or the
        dashboard and it cannot be restored. Corresponds to
        [`liveblocks.deleteComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads-threadId-comments-commentId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import delete_comment

        return delete_comment._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    def add_comment_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: AddCommentReactionRequestBody,
    ) -> CommentReaction:
        """Add comment reaction

         This endpoint adds a reaction to a comment. Corresponds to
        [`liveblocks.addCommentReaction`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-comments-commentId-add-reaction).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (AddCommentReactionRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CommentReaction
        """

        from .api.comments import add_comment_reaction

        return add_comment_reaction._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def remove_comment_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: RemoveCommentReactionRequestBody,
    ) -> None:
        """Remove comment reaction

         This endpoint removes a comment reaction. A deleted comment reaction is no longer accessible from
        the API or the dashboard and it cannot be restored. Corresponds to
        [`liveblocks.removeCommentReaction`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-comments-commentId-add-reaction).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (RemoveCommentReactionRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import remove_comment_reaction

        return remove_comment_reaction._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def get_attachment(
        self,
        room_id: str,
        attachment_id: str,
    ) -> AttachmentWithUrl:
        """Get attachment

         Gets an attachment's metadata and a presigned download URL. The URL expires after 1 hour.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            attachment_id (str): ID of the attachment Example: at_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AttachmentWithUrl
        """

        from .api.comments import get_attachment

        return get_attachment._sync(
            room_id=room_id,
            attachment_id=attachment_id,
            client=self._client,
        )

    def edit_comment_metadata(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: EditCommentMetadataRequestBody,
    ) -> CommentMetadata:
        """Edit comment metadata

         This endpoint edits the metadata of a comment. The metadata is a JSON object that can be used to
        store any information you want about the comment, in `string`, `number`, or `boolean` form. Set a
        property to `null` to remove it. Corresponds to
        [`liveblocks.editCommentMetadata`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-comments-commentId-metadata).

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (EditCommentMetadataRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CommentMetadata
        """

        from .api.comments import edit_comment_metadata

        return edit_comment_metadata._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def get_thread_inbox_notifications(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetThreadInboxNotificationsResponse:
        """Get thread inbox notifications

         This endpoint returns the inbox notifications associated with a specific thread. Because this
        endpoint is not user-scoped, each notification includes a `userId` field identifying which user the
        notification belongs to. Only thread-kind notifications are returned.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetThreadInboxNotificationsResponse
        """

        from .api.comments import get_thread_inbox_notifications

        return get_thread_inbox_notifications._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def get_feeds(
        self,
        room_id: str,
        *,
        cursor: str | Unset = UNSET,
        since: int | Unset = UNSET,
        limit: int | Unset = 20,
    ) -> GetFeedsResponse:
        """Get room feeds

         This endpoint returns the feeds in the requested room. Corresponds to
        [`liveblocks.getFeeds`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        feeds).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            cursor (str | Unset): A cursor used for pagination. Get the value from the `nextCursor`
                response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            since (int | Unset): Only return feeds with `createdAt` greater than this Unix timestamp
                in milliseconds. Example: 1660000988137.
            limit (int | Unset): A limit on the number of feeds to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetFeedsResponse
        """

        from .api.feeds import get_feeds

        return get_feeds._sync(
            room_id=room_id,
            cursor=cursor,
            since=since,
            limit=limit,
            client=self._client,
        )

    def create_feed(
        self,
        room_id: str,
        *,
        body: CreateFeedRequestBody,
    ) -> Feed:
        """Create feed

         This endpoint creates a new feed in a room. Corresponds to
        [`liveblocks.createFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-feeds).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (CreateFeedRequestBody): Request body for `POST /v2/rooms/{roomId}/feeds`. Optional
                creation time is sent as `timestamp` (milliseconds), not `createdAt`.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Feed
        """

        from .api.feeds import create_feed

        return create_feed._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_feed(
        self,
        room_id: str,
        feed_id: str,
    ) -> Feed:
        """Get feed

         This endpoint returns a feed by its ID. Corresponds to
        [`liveblocks.getFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        feeds-feedId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Feed
        """

        from .api.feeds import get_feed

        return get_feed._sync(
            room_id=room_id,
            feed_id=feed_id,
            client=self._client,
        )

    def delete_feed(
        self,
        room_id: str,
        feed_id: str,
    ) -> None:
        """Delete feed

         This endpoint deletes a feed. Corresponds to
        [`liveblocks.deleteFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-
        roomId-feeds-feedId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.feeds import delete_feed

        return delete_feed._sync(
            room_id=room_id,
            feed_id=feed_id,
            client=self._client,
        )

    def update_feed(
        self,
        room_id: str,
        feed_id: str,
        *,
        body: UpdateFeedRequestBody,
    ) -> Feed:
        """Update feed

         This endpoint updates the metadata of a feed. Corresponds to
        [`liveblocks.updateFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#patch-rooms-
        roomId-feeds-feedId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            body (UpdateFeedRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Feed
        """

        from .api.feeds import update_feed

        return update_feed._sync(
            room_id=room_id,
            feed_id=feed_id,
            body=body,
            client=self._client,
        )

    def get_feed_messages(
        self,
        room_id: str,
        feed_id: str,
        *,
        cursor: str | Unset = UNSET,
        since: int | Unset = UNSET,
        limit: int | Unset = 20,
    ) -> GetFeedMessagesResponse:
        """Get feed messages

         This endpoint returns the messages in a feed. Corresponds to
        [`liveblocks.getFeedMessages`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomId-feeds-feedId-messages).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            cursor (str | Unset): A cursor used for pagination. Get the value from the `nextCursor`
                response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            since (int | Unset): Only return messages with `createdAt` greater than this Unix
                timestamp in milliseconds. Example: 1660000988137.
            limit (int | Unset): A limit on the number of messages to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetFeedMessagesResponse
        """

        from .api.feeds import get_feed_messages

        return get_feed_messages._sync(
            room_id=room_id,
            feed_id=feed_id,
            cursor=cursor,
            since=since,
            limit=limit,
            client=self._client,
        )

    def create_feed_message(
        self,
        room_id: str,
        feed_id: str,
        *,
        body: CreateFeedMessageRequestBody,
    ) -> FeedMessage:
        """Create feed message

         This endpoint creates a new message in a feed. Corresponds to
        [`liveblocks.createFeedMessage`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-feeds-feedId-messages).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            body (CreateFeedMessageRequestBody): Request body for `POST
                /v2/rooms/{roomId}/feeds/{feedId}/messages`. Optional message time is sent as `timestamp`
                (milliseconds), not `createdAt`.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            FeedMessage
        """

        from .api.feeds import create_feed_message

        return create_feed_message._sync(
            room_id=room_id,
            feed_id=feed_id,
            body=body,
            client=self._client,
        )

    def delete_feed_message(
        self,
        room_id: str,
        feed_id: str,
        message_id: str,
    ) -> None:
        """Delete feed message

         This endpoint deletes a feed message. Corresponds to
        [`liveblocks.deleteFeedMessage`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-
        rooms-roomId-feeds-feedId-messages-messageId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            message_id (str): ID of the message Example: msg_xyz789.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.feeds import delete_feed_message

        return delete_feed_message._sync(
            room_id=room_id,
            feed_id=feed_id,
            message_id=message_id,
            client=self._client,
        )

    def update_feed_message(
        self,
        room_id: str,
        feed_id: str,
        message_id: str,
        *,
        body: UpdateFeedMessageRequestBody,
    ) -> FeedMessage:
        """Update feed message

         This endpoint updates a feed message. Corresponds to
        [`liveblocks.updateFeedMessage`](https://liveblocks.io/docs/api-reference/liveblocks-node#patch-
        rooms-roomId-feeds-feedId-messages-messageId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            message_id (str): ID of the message Example: msg_xyz789.
            body (UpdateFeedMessageRequestBody): Request body for `PATCH
                /v2/rooms/{roomId}/feeds/{feedId}/messages/{messageId}`. Optional update time is sent as
                `timestamp` (milliseconds), not `updatedAt`.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            FeedMessage
        """

        from .api.feeds import update_feed_message

        return update_feed_message._sync(
            room_id=room_id,
            feed_id=feed_id,
            message_id=message_id,
            body=body,
            client=self._client,
        )

    def authorize_user(
        self,
        *,
        body: AuthorizeUserRequestBody,
    ) -> AuthorizeUserResponse:
        r"""Get access token with secret key

         This endpoint lets your application server (your back end) obtain a token that one of its clients
        (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
        application’s custom authentication endpoint. When making this request, you’ll have to use your
        secret key.

        **Important:** The difference with an [ID token](#post-identify-user) is that an access token holds
        all the permissions, and is the source of truth. With ID tokens, permissions are set in the
        Liveblocks back end (through REST API calls) and \"checked at the door\" every time they are used to
        enter a room.

        **Note:** When using the `@liveblocks/node` package, you can use
        [`Liveblocks.prepareSession`](https://liveblocks.io/docs/api-reference/liveblocks-node#access-
        tokens) in your back end to build this request.

        You can pass the property `userId` in the request’s body. This can be whatever internal identifier
        you use for your user accounts as long as it uniquely identifies an account. The property `userId`
        is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
        corresponds to one MAU.

        Additionally, you can set custom metadata to the token, which will be publicly accessible by other
        clients through the `user.info` property. This is useful for storing static data like avatar images
        or the user’s display name.

        Lastly, you’ll specify the exact permissions to give to the user using the `permissions` field. This
        is done in an object where the keys are room names, or room name patterns (ending in a `*`), and a
        list of permissions to assign the user for any room that matches that name exactly (or starts with
        the pattern’s prefix). For tips, see [Manage permissions with access
        tokens](https://liveblocks.io/docs/authentication/access-token).

        Args:
            body (AuthorizeUserRequestBody):  Example: {'userId': 'user-123', 'userInfo': {'name':
                'bob', 'avatar': 'https://example.org/images/user123.jpg'}, 'organizationId': 'acme-corp',
                'permissions': {'my-room-1': ['room:write'], 'my-room-2': ['room:write'], 'my-room-*':
                ['room:read']}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AuthorizeUserResponse
        """

        from .api.auth import authorize_user

        return authorize_user._sync(
            body=body,
            client=self._client,
        )

    def identify_user(
        self,
        *,
        body: IdentifyUserRequestBody,
    ) -> IdentifyUserResponse:
        r"""Get ID token with secret key

         This endpoint lets your application server (your back end) obtain a token that one of its clients
        (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
        application’s custom authentication endpoint. When using this endpoint to obtain ID tokens, you
        should manage your permissions by assigning user and/or group permissions to rooms explicitly, see
        our [Manage permissions with ID tokens](https://liveblocks.io/docs/authentication/id-token) section.

        **Important:** The difference with an [access token](#post-authorize-user) is that an ID token
        doesn’t hold any permissions itself. With ID tokens, permissions are set in the Liveblocks back end
        (through REST API calls) and \"checked at the door\" every time they are used to enter a room. With
        access tokens, all permissions are set in the token itself, and thus controlled from your back end
        entirely.

        **Note:** When using the `@liveblocks/node` package, you can use
        [`Liveblocks.identifyUser`](https://liveblocks.io/docs/api-reference/liveblocks-node) in your back
        end to build this request.

        You can pass the property `userId` in the request’s body. This can be whatever internal identifier
        you use for your user accounts as long as it uniquely identifies an account. The property `userId`
        is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
        corresponds to one MAU.

        If you want to use group permissions, you can also declare which `groupIds` this user belongs to.
        The group ID values are yours, but they will have to match the group IDs you assign permissions to
        when assigning permissions to rooms, see [Manage permissions with ID
        tokens](https://liveblocks.io/docs/authentication/id-token)).

        Additionally, you can set custom metadata to the token, which will be publicly accessible by other
        clients through the `user.info` property. This is useful for storing static data like avatar images
        or the user’s display name.

        Args:
            body (IdentifyUserRequestBody):  Example: {'userId': 'user-123', 'organizationId': 'acme-
                corp', 'groupIds': ['marketing', 'engineering'], 'userInfo': {'name': 'bob', 'avatar':
                'https://example.org/images/user123.jpg'}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            IdentifyUserResponse
        """

        from .api.auth import identify_user

        return identify_user._sync(
            body=body,
            client=self._client,
        )

    def get_inbox_notification(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> InboxNotificationCustomData | InboxNotificationThreadData:
        """Get inbox notification

         This endpoint returns a user’s inbox notification by its ID. Corresponds to
        [`liveblocks.getInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        users-userId-inboxNotifications-inboxNotificationId).

        Args:
            user_id (str): ID of the user Example: user-123.
            inbox_notification_id (str): ID of the inbox notification Example: in_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            InboxNotificationCustomData | InboxNotificationThreadData
        """

        from .api.notifications import get_inbox_notification

        return get_inbox_notification._sync(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    def delete_inbox_notification(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> None:
        """Delete inbox notification

         This endpoint deletes a user’s inbox notification by its ID. Corresponds to
        [`liveblocks.deleteInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-users-userId-inbox-notifications-inboxNotificationId).

        Args:
            user_id (str): ID of the user Example: user-123.
            inbox_notification_id (str): ID of the inbox notification Example: in_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_inbox_notification

        return delete_inbox_notification._sync(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    def get_inbox_notifications(
        self,
        user_id: str,
        *,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        limit: int | Unset = 50,
        starting_after: str | Unset = UNSET,
    ) -> GetInboxNotificationsResponse:
        """Get all inbox notifications

         This endpoint returns all the user’s inbox notifications. Corresponds to
        [`liveblocks.getInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        users-userId-inboxNotifications).

        Args:
            user_id (str): ID of the user Example: user-123.
            organization_id (str | Unset): The organization ID to filter notifications for. Example:
                org_123456789.
            query (str | Unset): Query to filter notifications. You can filter by `unread`, for
                example, `unread:true`. Example: metadata["color"]:"blue".
            limit (int | Unset): A limit on the number of inbox notifications to be returned. The
                limit can range between 1 and 50, and defaults to 50. Default: 50. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetInboxNotificationsResponse
        """

        from .api.notifications import get_inbox_notifications

        return get_inbox_notifications._sync(
            user_id=user_id,
            organization_id=organization_id,
            query=query,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def delete_all_inbox_notifications(
        self,
        user_id: str,
    ) -> None:
        """Delete all inbox notifications

         This endpoint deletes all the user’s inbox notifications. Corresponds to
        [`liveblocks.deleteAllInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-users-userId-inbox-notifications).

        Args:
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_all_inbox_notifications

        return delete_all_inbox_notifications._sync(
            user_id=user_id,
            client=self._client,
        )

    def get_notification_settings(
        self,
        user_id: str,
    ) -> NotificationSettings:
        """Get notification settings

         This endpoint returns a user's notification settings for the project. Corresponds to
        [`liveblocks.getNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        users-userId-notification-settings).

        Args:
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            NotificationSettings
        """

        from .api.notifications import get_notification_settings

        return get_notification_settings._sync(
            user_id=user_id,
            client=self._client,
        )

    def update_notification_settings(
        self,
        user_id: str,
        *,
        body: UpdateNotificationSettingsRequestBody,
    ) -> NotificationSettings:
        """Update notification settings

         This endpoint updates a user's notification settings for the project. Corresponds to
        [`liveblocks.updateNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#post-users-userId-notification-settings).

        Args:
            user_id (str): ID of the user Example: user-123.
            body (UpdateNotificationSettingsRequestBody): Partial notification settings - all
                properties are optional Example: {'email': {'thread': True, 'textMention': False},
                'slack': {'textMention': False}, 'webPush': {'thread': True}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            NotificationSettings
        """

        from .api.notifications import update_notification_settings

        return update_notification_settings._sync(
            user_id=user_id,
            body=body,
            client=self._client,
        )

    def delete_notification_settings(
        self,
        user_id: str,
    ) -> None:
        """Delete notification settings

         This endpoint deletes a user's notification settings for the project. Corresponds to
        [`liveblocks.deleteNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-users-userId-notification-settings).

        Args:
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_notification_settings

        return delete_notification_settings._sync(
            user_id=user_id,
            client=self._client,
        )

    def get_room_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        """Get room subscription settings

         This endpoint returns a user’s subscription settings for a specific room. Corresponds to
        [`liveblocks.getRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-rooms-roomId-users-userId-subscription-settings).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            RoomSubscriptionSettings
        """

        from .api.notifications import get_room_subscription_settings

        return get_room_subscription_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def update_room_subscription_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: UpdateRoomSubscriptionSettingsRequestBody,
    ) -> RoomSubscriptionSettings:
        """Update room subscription settings

         This endpoint updates a user’s subscription settings for a specific room. Corresponds to
        [`liveblocks.updateRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#post-rooms-roomId-users-userId-subscription-settings).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            user_id (str): ID of the user Example: user-123.
            body (UpdateRoomSubscriptionSettingsRequestBody): Partial room subscription settings - all
                properties are optional Example: {'threads': 'replies_and_mentions', 'textMentions':
                'none'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            RoomSubscriptionSettings
        """

        from .api.notifications import update_room_subscription_settings

        return update_room_subscription_settings._sync(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    def delete_room_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> None:
        """Delete room subscription settings

         This endpoint deletes a user’s subscription settings for a specific room. Corresponds to
        [`liveblocks.deleteRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-rooms-roomId-users-userId-subscription-settings).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_room_subscription_settings

        return delete_room_subscription_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def get_user_room_subscription_settings(
        self,
        user_id: str,
        *,
        starting_after: str | Unset = UNSET,
        limit: int | Unset = 50,
        organization_id: str | Unset = UNSET,
    ) -> GetRoomSubscriptionSettingsResponse:
        """Get user room subscription settings

         This endpoint returns the list of a user's room subscription settings. Corresponds to
        [`liveblocks.getUserRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-users-userId-room-subscription-settings).

        Args:
            user_id (str): ID of the user Example: user-123.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            limit (int | Unset): A limit on the number of elements to be returned. The limit can range
                between 1 and 50, and defaults to 50. Default: 50. Example: 20.
            organization_id (str | Unset): The organization ID to filter room subscription settings
                for. Example: org_123456789.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetRoomSubscriptionSettingsResponse
        """

        from .api.notifications import get_user_room_subscription_settings

        return get_user_room_subscription_settings._sync(
            user_id=user_id,
            starting_after=starting_after,
            limit=limit,
            organization_id=organization_id,
            client=self._client,
        )

    def trigger_inbox_notification(
        self,
        *,
        body: TriggerInboxNotificationRequestBody,
    ) -> None:
        """Trigger inbox notification

         This endpoint triggers an inbox notification. Corresponds to
        [`liveblocks.triggerInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#post-inbox-notifications-trigger).

        Args:
            body (TriggerInboxNotificationRequestBody):  Example: {'userId': 'alice', 'kind':
                '$fileUploaded', 'subjectId': 'file123', 'activityData': {'url': 'url-to-file'}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import trigger_inbox_notification

        return trigger_inbox_notification._sync(
            body=body,
            client=self._client,
        )

    def mark_inbox_notification_as_read(
        self,
        inbox_notification_id: str,
    ) -> None:
        """Mark inbox notification as read

         This endpoint marks a specific inbox notification as read.

        Args:
            inbox_notification_id (str): ID of the inbox notification Example: in_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import mark_inbox_notification_as_read

        return mark_inbox_notification_as_read._sync(
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    def get_groups(
        self,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetGroupsResponse:
        """Get groups

         This endpoint returns a list of all groups in your project. Corresponds to
        [`liveblocks.getGroups`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-groups).

        Args:
            limit (int | Unset): A limit on the number of groups to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetGroupsResponse
        """

        from .api.groups import get_groups

        return get_groups._sync(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def create_group(
        self,
        *,
        body: CreateGroupRequestBody,
    ) -> Group:
        """Create group

         This endpoint creates a new group. Corresponds to
        [`liveblocks.createGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-group).

        Args:
            body (CreateGroupRequestBody):  Example: {'id': 'engineering', 'memberIds': ['alice',
                'bob'], 'organizationId': 'org_123456789', 'scopes': {'mention': True}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import create_group

        return create_group._sync(
            body=body,
            client=self._client,
        )

    def get_group(
        self,
        group_id: str,
    ) -> Group:
        """Get group

         This endpoint returns a specific group by ID. Corresponds to
        [`liveblocks.getGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-group).

        Args:
            group_id (str): The ID of the group to retrieve. Example: engineering.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import get_group

        return get_group._sync(
            group_id=group_id,
            client=self._client,
        )

    def delete_group(
        self,
        group_id: str,
    ) -> None:
        """Delete group

         This endpoint deletes a group. Corresponds to
        [`liveblocks.deleteGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-group).

        Args:
            group_id (str): The ID of the group to delete. Example: engineering.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.groups import delete_group

        return delete_group._sync(
            group_id=group_id,
            client=self._client,
        )

    def add_group_members(
        self,
        group_id: str,
        *,
        body: AddGroupMembersRequestBody,
    ) -> Group:
        """Add group members

         This endpoint adds new members to an existing group. Corresponds to
        [`liveblocks.addGroupMembers`](https://liveblocks.io/docs/api-reference/liveblocks-node#add-group-
        members).

        Args:
            group_id (str): The ID of the group to add members to. Example: engineering.
            body (AddGroupMembersRequestBody):  Example: {'memberIds': ['charlie', 'dave']}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import add_group_members

        return add_group_members._sync(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    def remove_group_members(
        self,
        group_id: str,
        *,
        body: RemoveGroupMembersRequestBody,
    ) -> Group:
        """Remove group members

         This endpoint removes members from an existing group. Corresponds to
        [`liveblocks.removeGroupMembers`](https://liveblocks.io/docs/api-reference/liveblocks-node#remove-
        group-members).

        Args:
            group_id (str): The ID of the group to remove members from. Example: engineering.
            body (RemoveGroupMembersRequestBody):  Example: {'memberIds': ['charlie']}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import remove_group_members

        return remove_group_members._sync(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    def get_user_groups(
        self,
        user_id: str,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetUserGroupsResponse:
        """Get user groups

         This endpoint returns all groups that a specific user is a member of. Corresponds to
        [`liveblocks.getUserGroups`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-user-
        groups).

        Args:
            user_id (str): The ID of the user to get groups for. Example: user-123.
            limit (int | Unset): A limit on the number of groups to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetUserGroupsResponse
        """

        from .api.groups import get_user_groups

        return get_user_groups._sync(
            user_id=user_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def get_ai_copilots(
        self,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetAiCopilotsResponse:
        """Get AI copilots

         This endpoint returns a paginated list of AI copilots. The copilots are returned sorted by creation
        date, from newest to oldest. Corresponds to
        [`liveblocks.getAiCopilots`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-ai-
        copilots).

        Args:
            limit (int | Unset): A limit on the number of copilots to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetAiCopilotsResponse
        """

        from .api.ai import get_ai_copilots

        return get_ai_copilots._sync(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def create_ai_copilot(
        self,
        *,
        body: CreateAiCopilotOptionsAnthropic
        | CreateAiCopilotOptionsGoogle
        | CreateAiCopilotOptionsOpenAi
        | CreateAiCopilotOptionsOpenAiCompatible,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
        """Create AI copilot

         This endpoint creates a new AI copilot with the given configuration. Corresponds to
        [`liveblocks.createAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-ai-
        copilot).

        Args:
            body (CreateAiCopilotOptionsAnthropic | CreateAiCopilotOptionsGoogle |
                CreateAiCopilotOptionsOpenAi | CreateAiCopilotOptionsOpenAiCompatible):  Example: {'name':
                'My Copilot', 'systemPrompt': 'You are a helpful assistant.', 'providerApiKey': 'sk-...',
                'provider': 'openai', 'providerModel': 'gpt-4o'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
        """

        from .api.ai import create_ai_copilot

        return create_ai_copilot._sync(
            body=body,
            client=self._client,
        )

    def get_ai_copilot(
        self,
        copilot_id: str,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
        """Get AI copilot

         This endpoint returns an AI copilot by its ID. Corresponds to
        [`liveblocks.getAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-ai-
        copilot).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
        """

        from .api.ai import get_ai_copilot

        return get_ai_copilot._sync(
            copilot_id=copilot_id,
            client=self._client,
        )

    def update_ai_copilot(
        self,
        copilot_id: str,
        *,
        body: UpdateAiCopilotRequestBody,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
        r"""Update AI copilot

         This endpoint updates an existing AI copilot's configuration. Corresponds to
        [`liveblocks.updateAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#update-ai-
        copilot).

        This endpoint returns a 422 response if the update doesn't apply due to validation failures. For
        example, if the existing copilot uses the \"openai\" provider and you attempt to update the provider
        model to an incompatible value for the provider, like \"gemini-2.5-pro\", you'll receive a 422
        response with an error message explaining where the validation failed.

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            body (UpdateAiCopilotRequestBody):  Example: {'name': 'Updated Copilot', 'systemPrompt':
                'You are an updated helpful assistant.', 'providerModel': 'gpt-4o', 'settings':
                {'maxTokens': 8192}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
        """

        from .api.ai import update_ai_copilot

        return update_ai_copilot._sync(
            copilot_id=copilot_id,
            body=body,
            client=self._client,
        )

    def delete_ai_copilot(
        self,
        copilot_id: str,
    ) -> None:
        """Delete AI copilot

         This endpoint deletes an AI copilot by its ID. A deleted copilot is no longer accessible and cannot
        be restored. Corresponds to [`liveblocks.deleteAiCopilot`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#delete-ai-copilot).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.ai import delete_ai_copilot

        return delete_ai_copilot._sync(
            copilot_id=copilot_id,
            client=self._client,
        )

    def get_knowledge_sources(
        self,
        copilot_id: str,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetKnowledgeSourcesResponse:
        """Get knowledge sources

         This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
        to [`liveblocks.getKnowledgeSources`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        knowledge-sources).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            limit (int | Unset): A limit on the number of knowledge sources to be returned. The limit
                can range between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetKnowledgeSourcesResponse
        """

        from .api.ai import get_knowledge_sources

        return get_knowledge_sources._sync(
            copilot_id=copilot_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def get_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> KnowledgeSourceFileSource | KnowledgeSourceWebSource:
        """Get knowledge source

         This endpoint returns a specific knowledge source by its ID. Corresponds to
        [`liveblocks.getKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            KnowledgeSourceFileSource | KnowledgeSourceWebSource
        """

        from .api.ai import get_knowledge_source

        return get_knowledge_source._sync(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    def create_web_knowledge_source(
        self,
        copilot_id: str,
        *,
        body: CreateWebKnowledgeSourceRequestBody,
    ) -> CreateWebKnowledgeSourceResponse:
        """Create web knowledge source

         This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
        and learn from web content. Corresponds to
        [`liveblocks.createWebKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#create-web-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            body (CreateWebKnowledgeSourceRequestBody):  Example: {'copilotId': 'cp_abc123', 'url':
                'https://docs.example.com', 'type': 'crawl'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CreateWebKnowledgeSourceResponse
        """

        from .api.ai import create_web_knowledge_source

        return create_web_knowledge_source._sync(
            copilot_id=copilot_id,
            body=body,
            client=self._client,
        )

    def create_file_knowledge_source(
        self,
        copilot_id: str,
        name: str,
        *,
        body: File,
    ) -> CreateFileKnowledgeSourceResponse:
        """Create file knowledge source

         This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
        then reference the content of the file when responding. Corresponds to
        [`liveblocks.createFileKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#create-file-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            name (str): Name of the file Example: document.pdf.
            body (File):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CreateFileKnowledgeSourceResponse
        """

        from .api.ai import create_file_knowledge_source

        return create_file_knowledge_source._sync(
            copilot_id=copilot_id,
            name=name,
            body=body,
            client=self._client,
        )

    def get_file_knowledge_source_markdown(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> GetFileKnowledgeSourceMarkdownResponse:
        """Get file knowledge source content

         This endpoint returns the content of a file knowledge source as markdown. This allows you to see
        what content the AI copilot has access to from uploaded files. Corresponds to
        [`liveblocks.getFileKnowledgeSourceMarkdown`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-file-knowledge-source-markdown).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetFileKnowledgeSourceMarkdownResponse
        """

        from .api.ai import get_file_knowledge_source_markdown

        return get_file_knowledge_source_markdown._sync(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    def delete_file_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> None:
        """Delete file knowledge source

         This endpoint deletes a file knowledge source from an AI copilot. The copilot will no longer have
        access to the content from this file. Corresponds to
        [`liveblocks.deleteFileKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-file-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.ai import delete_file_knowledge_source

        return delete_file_knowledge_source._sync(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    def delete_web_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> None:
        """Delete web knowledge source

         This endpoint deletes a web knowledge source from an AI copilot. The copilot will no longer have
        access to the content from this source. Corresponds to
        [`liveblocks.deleteWebKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-web-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.ai import delete_web_knowledge_source

        return delete_web_knowledge_source._sync(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    def get_web_knowledge_source_links(
        self,
        copilot_id: str,
        knowledge_source_id: str,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetWebKnowledgeSourceLinksResponse:
        """Get web knowledge source links

         This endpoint returns a paginated list of links that were indexed from a web knowledge source. This
        is useful for understanding what content the AI copilot has access to from web sources. Corresponds
        to [`liveblocks.getWebKnowledgeSourceLinks`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-web-knowledge-source-links).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.
            limit (int | Unset): A limit on the number of links to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetWebKnowledgeSourceLinksResponse
        """

        from .api.ai import get_web_knowledge_source_links

        return get_web_knowledge_source_links._sync(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )


class AsyncLiveblocks:
    """Asynchronous client for the Liveblocks API.

    Args:
        secret: The Liveblocks secret key. Must start with ``sk_``.
            Get it from https://liveblocks.io/dashboard/apikeys
        base_url: Point the client to an alternative Liveblocks server.
    """

    _client: httpx.AsyncClient

    def __init__(self, *, secret: str, base_url: str | None = None) -> None:
        _assert_secret_key(secret)
        self._client = httpx.AsyncClient(
            base_url=base_url or _DEFAULT_BASE_URL,
            headers={"Authorization": f"Bearer {secret}"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> AsyncLiveblocks:
        await self._client.__aenter__()
        return self

    async def __aexit__(self, *args: Any, **kwargs: Any) -> None:
        await self._client.__aexit__(*args, **kwargs)

    def prepare_session(
        self,
        user_id: str,
        user_info: dict[str, Any] | None = None,
        organization_id: str | None = None,
    ) -> AsyncSession:
        from .session import AsyncSession

        return AsyncSession(
            client=self,
            user_id=user_id,
            user_info=user_info,
            organization_id=organization_id,
        )

    async def get_rooms(
        self,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        user_id: str | Unset = UNSET,
        group_ids: str | Unset = UNSET,
    ) -> GetRoomsResponse:
        """Get rooms

         This endpoint returns a list of your rooms. The rooms are returned sorted by creation date, from
        newest to oldest. You can filter rooms by room ID prefixes, metadata, users accesses, and groups
        accesses. Corresponds to [`liveblocks.getRooms`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#get-rooms).

        There is a pagination system where the cursor to the next page is returned in the response as
        `nextCursor`, which can be combined with `startingAfter`.
        You can also limit the number of rooms by query.

        Filtering by metadata works by giving key values like `metadata.color=red`. Of course you can
        combine multiple metadata clauses to refine the response like
        `metadata.color=red&metadata.type=text`. Notice here the operator AND is applied between each
        clauses.

        Filtering by groups or userId works by giving a list of groups like
        `groupIds=marketing,GZo7tQ,product` or/and a userId like `userId=user1`.
        Notice here the operator OR is applied between each `groupIds` and the `userId`.

        Args:
            limit (int | Unset): A limit on the number of rooms to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            organization_id (str | Unset): A filter on organization ID. Example: org_123456789.
            query (str | Unset): Query to filter rooms. You can filter by `roomId` and `metadata`, for
                example, `metadata["roomType"]:"whiteboard" AND roomId^"liveblocks:engineering"`. Learn
                more about [filtering rooms with query language](https://liveblocks.io/docs/guides/how-to-
                filter-rooms-using-query-language). Example: metadata["color"]:"blue".
            user_id (str | Unset): A filter on users accesses. Example: user-123.
            group_ids (str | Unset): A filter on groups accesses. Multiple groups can be used.
                Example: group1,group2.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetRoomsResponse
        """

        from .api.room import get_rooms

        return await get_rooms._asyncio(
            limit=limit,
            starting_after=starting_after,
            organization_id=organization_id,
            query=query,
            user_id=user_id,
            group_ids=group_ids,
            client=self._client,
        )

    async def create_room(
        self,
        *,
        body: CreateRoomRequestBody,
        idempotent: bool | Unset = UNSET,
    ) -> Room:
        r"""Create room

         This endpoint creates a new room. `id` and `defaultAccesses` are required. When provided with a
        `?idempotent` query argument, will not return a 409 when the room already exists, but instead return
        the existing room as-is. Corresponds to [`liveblocks.createRoom`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#post-rooms), or to
        [`liveblocks.getOrCreateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-or-
        create-rooms-roomId) when `?idempotent` is provided.
        - `defaultAccesses` could be `[]` or `[\"room:write\"]` (private or public).
        - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
        Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
        `metadata` is optional field.
        - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
        1000 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
        - `groupsAccesses` are optional fields.

        Args:
            idempotent (bool | Unset): When provided, will not return a 409 when the room already
                exists, but instead return the existing room as-is. Corresponds to
                [`liveblocks.getOrCreateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-
                node#get-or-create-rooms-roomId). Example: True.
            body (CreateRoomRequestBody):  Example: {'id': 'my-room-id', 'defaultAccesses':
                ['room:write'], 'metadata': {'color': 'blue'}, 'usersAccesses': {'alice': ['room:write']},
                'groupsAccesses': {'product': ['room:write']}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import create_room

        return await create_room._asyncio(
            body=body,
            idempotent=idempotent,
            client=self._client,
        )

    async def get_room(
        self,
        room_id: str,
    ) -> Room:
        """Get room

         This endpoint returns a room by its ID. Corresponds to
        [`liveblocks.getRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomid).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import get_room

        return await get_room._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def update_room(
        self,
        room_id: str,
        *,
        body: UpdateRoomRequestBody,
    ) -> Room:
        r"""Update room

         This endpoint updates specific properties of a room. Corresponds to
        [`liveblocks.updateRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomid).

        It’s not necessary to provide the entire room’s information.
        Setting a property to `null` means to delete this property. For example, if you want to remove
        access to a specific user without losing other users:
        ``{
            \"usersAccesses\": {
                \"john\": null
            }
        }``
        `defaultAccesses`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

        - `defaultAccesses` could be `[]` or `[\"room:write\"]` (private or public).
        - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
        Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
        `metadata` is optional field.
        - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
        1000 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
        - `groupsAccesses` could be `[]` or `[\"room:write\"]` for every records. `groupsAccesses` can
        contain 1000 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional
        field.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (UpdateRoomRequestBody):  Example: {'defaultAccesses': ['room:write'],
                'usersAccesses': {'alice': ['room:write']}, 'groupsAccesses': {'marketing':
                ['room:write']}, 'metadata': {'color': 'blue'}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import update_room

        return await update_room._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def delete_room(
        self,
        room_id: str,
    ) -> None:
        """Delete room

         This endpoint deletes a room. A deleted room is no longer accessible from the API or the dashboard
        and it cannot be restored. Corresponds to [`liveblocks.deleteRoom`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#delete-rooms-roomid).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import delete_room

        return await delete_room._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def prewarm_room(
        self,
        room_id: str,
    ) -> None:
        """Prewarm room

         Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
        connecting to a room with [`RoomProvider`](https://liveblocks.io/docs/api-reference/liveblocks-
        react#RoomProvider) or [`enterRoom`](https://liveblocks.io/docs/api-reference/liveblocks-
        client#Client.enterRoom) within 10 seconds, and the room will load quicker. Corresponds to
        [`liveblocks.prewarmRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomid-prewarm).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import prewarm_room

        return await prewarm_room._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def upsert_room(
        self,
        room_id: str,
        *,
        body: UpsertRoomRequestBody,
    ) -> Room:
        r"""Upsert (update or create) room

         This endpoint updates specific properties of a room. Corresponds to
        [`liveblocks.upsertRoom`](https://liveblocks.io/docs/api-reference/liveblocks-node#upsert-rooms-
        roomId).

        It’s not necessary to provide the entire room’s information.
        Setting a property to `null` means to delete this property. For example, if you want to remove
        access to a specific user without losing other users:
        ``{
            \"usersAccesses\": {
                \"john\": null
            }
        }``
        `defaultAccesses`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

        - `defaultAccesses` could be `[]` or `[\"room:write\"]` (private or public).
        - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
        Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
        `metadata` is optional field.
        - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
        1000 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
        - `groupsAccesses` could be `[]` or `[\"room:write\"]` for every records. `groupsAccesses` can
        contain 1000 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional
        field.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (UpsertRoomRequestBody):  Example: {'update': {'usersAccesses': {'alice':
                ['room:write']}, 'groupsAccesses': {'marketing': ['room:write']}, 'metadata': {'color':
                'blue'}}, 'create': {'defaultAccesses': ['room:write']}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import upsert_room

        return await upsert_room._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def update_room_id(
        self,
        room_id: str,
        *,
        body: UpdateRoomIdRequestBody,
    ) -> Room:
        """Update room ID

         This endpoint permanently updates the room’s ID. All existing references to the old room ID will
        need to be updated. Returns the updated room. Corresponds to
        [`liveblocks.updateRoomId`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomid-update-room-id).

        Args:
            room_id (str): The new ID for the room Example: my-room-id.
            body (UpdateRoomIdRequestBody):  Example: {'newRoomId': 'new-room-id'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import update_room_id

        return await update_room_id._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def update_room_organization_id(
        self,
        room_id: str,
        *,
        body: UpdateRoomOrganizationIdRequestBody,
    ) -> Room:
        """Update room organization ID

         This endpoint updates the room's organization ID. The `fromOrganizationId` must match the room's
        current organization ID. Returns the updated room.

        Args:
            room_id (str): The ID of the room Example: my-room-id.
            body (UpdateRoomOrganizationIdRequestBody):  Example: {'fromOrganizationId':
                'org_123456789', 'toOrganizationId': 'org_987654321'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Room
        """

        from .api.room import update_room_organization_id

        return await update_room_organization_id._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_active_users(
        self,
        room_id: str,
    ) -> ActiveUsersResponse:
        """Get active users

         This endpoint returns a list of users currently present in the requested room. Corresponds to
        [`liveblocks.getActiveUsers`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomid-active-users).

        For optimal performance, we recommend calling this endpoint no more than once every 10 seconds.
        Duplicates can occur if a user is in the requested room with multiple browser tabs opened.

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            ActiveUsersResponse
        """

        from .api.room import get_active_users

        return await get_active_users._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def set_presence(
        self,
        room_id: str,
        *,
        body: SetPresenceRequestBody,
    ) -> None:
        """Set ephemeral presence

         This endpoint sets ephemeral presence for a user in a room without requiring a WebSocket connection.
        The presence data will automatically expire after the specified TTL (time-to-live). This is useful
        for scenarios like showing an AI agent's presence in a room. The presence will be broadcast to all
        connected users in the room. Corresponds to
        [`liveblocks.setPresence`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-presence).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (SetPresenceRequestBody):  Example: {'userId': 'agent-123', 'data': {'status':
                'active', 'cursor': {'x': 100, 'y': 200}}, 'userInfo': {'name': 'AI Assistant', 'avatar':
                'https://example.org/images/agent123.jpg'}, 'ttl': 60}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import set_presence

        return await set_presence._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def broadcast_event(
        self,
        room_id: str,
        *,
        body: Any,
    ) -> None:
        """Broadcast event to a room

         This endpoint enables the broadcast of an event to a room without having to connect to it via the
        `client` from `@liveblocks/client`. It takes any valid JSON as a request body. The `connectionId`
        passed to event listeners is `-1` when using this API. Corresponds to
        [`liveblocks.broadcastEvent`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        broadcast-event).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (Any):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.room import broadcast_event

        return await broadcast_event._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_storage_document(
        self,
        room_id: str,
        *,
        format_: GetStorageDocumentFormat | Unset = UNSET,
    ) -> GetStorageDocumentResponse:
        r"""Get Storage document

         Returns the contents of the room’s Storage tree. Corresponds to
        [`liveblocks.getStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        rooms-roomId-storage).

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
            room_id (str): ID of the room Example: my-room-id.
            format_ (GetStorageDocumentFormat | Unset): Use the `json` format to output a simplified
                JSON representation of the Storage tree. In that format, each LiveObject and LiveMap will
                be formatted as a simple JSON object, and each LiveList will be formatted as a simple JSON
                array. This is a lossy format because information about the original data structures is
                not retained, but it may be easier to work with. Example: json.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetStorageDocumentResponse
        """

        from .api.storage import get_storage_document

        return await get_storage_document._asyncio(
            room_id=room_id,
            format_=format_,
            client=self._client,
        )

    async def initialize_storage_document(
        self,
        room_id: str,
        *,
        body: InitializeStorageDocumentBody,
    ) -> InitializeStorageDocumentResponse:
        r"""Initialize Storage document

         This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling
        this endpoint will disconnect all users from the room if there are any, triggering a reconnect.
        Corresponds to [`liveblocks.initializeStorageDocument`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#post-rooms-roomId-storage).

        The format of the request body is the same as what’s returned by the get Storage endpoint.

        For each Liveblocks data structure that you want to create, you need a JSON element having two
        properties:
        - `\"liveblocksType\"` => `\"LiveObject\" | \"LiveList\" | \"LiveMap\"`
        - `\"data\"` => contains the nested data structures (children) and data.

        The root’s type can only be LiveObject.

        A utility function, `toPlainLson` is included in `@liveblocks/client` from `1.0.9` to help convert
        `LiveObject`, `LiveList`, and `LiveMap` to the structure expected by the endpoint.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (InitializeStorageDocumentBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            InitializeStorageDocumentResponse
        """

        from .api.storage import initialize_storage_document

        return await initialize_storage_document._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def delete_storage_document(
        self,
        room_id: str,
    ) -> None:
        """Delete Storage document

         This endpoint deletes all of the room’s Storage data. Calling this endpoint will disconnect all
        users from the room if there are any. Corresponds to
        [`liveblocks.deleteStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-rooms-roomId-storage).

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.storage import delete_storage_document

        return await delete_storage_document._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def patch_storage_document(
        self,
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
        Patch](https://liveblocks.io/docs/guides/modifying-storage-via-rest-api-with-json-patch).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (list[AddJsonPatchOperation | CopyJsonPatchOperation | MoveJsonPatchOperation |
                RemoveJsonPatchOperation | ReplaceJsonPatchOperation | TestJsonPatchOperation]):  Example:
                [{'op': 'add', 'path': '/score', 'value': 42}, {'op': 'remove', 'path': '/oldKey'}].

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.storage import patch_storage_document

        return await patch_storage_document._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_yjs_document(
        self,
        room_id: str,
        *,
        formatting: bool | Unset = UNSET,
        key: str | Unset = UNSET,
        type_: GetYjsDocumentType | Unset = UNSET,
    ) -> GetYjsDocumentResponse:
        """Get Yjs document

         This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
        [`liveblocks.getYjsDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomId-ydoc).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            formatting (bool | Unset): If present, YText will return formatting.
            key (str | Unset): Returns only a single key’s value, e.g. `doc.get(key).toJSON()`.
                Example: root.
            type_ (GetYjsDocumentType | Unset): Used with key to override the inferred type, i.e.
                `"ymap"` will return `doc.get(key, Y.Map)`. Example: ymap.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetYjsDocumentResponse
        """

        from .api.yjs import get_yjs_document

        return await get_yjs_document._asyncio(
            room_id=room_id,
            formatting=formatting,
            key=key,
            type_=type_,
            client=self._client,
        )

    async def send_yjs_binary_update(
        self,
        room_id: str,
        *,
        body: File,
        guid: str | Unset = UNSET,
    ) -> None:
        """Send a binary Yjs update

         This endpoint is used to send a Yjs binary update to the room’s Yjs document. You can use this
        endpoint to initialize Yjs data for the room or to update the room’s Yjs document. To send an update
        to a subdocument instead of the main document, pass its `guid`. Corresponds to
        [`liveblocks.sendYjsBinaryUpdate`](https://liveblocks.io/docs/api-reference/liveblocks-node#put-
        rooms-roomId-ydoc).

        The update is typically obtained by calling `Y.encodeStateAsUpdate(doc)`. See the [Yjs
        documentation](https://docs.yjs.dev/api/document-updates) for more details. When manually making
        this HTTP call, set the HTTP header `Content-Type` to `application/octet-stream`, and send the
        binary update (a `Uint8Array`) in the body of the HTTP request. This endpoint does not accept JSON,
        unlike most other endpoints.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            guid (str | Unset): ID of the subdocument Example: subdoc-guid-123.
            body (File):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.yjs import send_yjs_binary_update

        return await send_yjs_binary_update._asyncio(
            room_id=room_id,
            body=body,
            guid=guid,
            client=self._client,
        )

    async def get_yjs_document_as_binary_update(
        self,
        room_id: str,
        *,
        guid: str | Unset = UNSET,
    ) -> File:
        """Get Yjs document encoded as a binary Yjs update

         This endpoint returns the room's Yjs document encoded as a single binary update. This can be used by
        `Y.applyUpdate(responseBody)` to get a copy of the document in your back end. See [Yjs
        documentation](https://docs.yjs.dev/api/document-updates) for more information on working with
        updates. To return a subdocument instead of the main document, pass its `guid`. Corresponds to
        [`liveblocks.getYjsDocumentAsBinaryUpdate`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-rooms-roomId-ydoc-binary).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            guid (str | Unset): ID of the subdocument Example: subdoc-guid-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            File
        """

        from .api.yjs import get_yjs_document_as_binary_update

        return await get_yjs_document_as_binary_update._asyncio(
            room_id=room_id,
            guid=guid,
            client=self._client,
        )

    async def get_yjs_versions(
        self,
        room_id: str,
        *,
        limit: int | Unset = 20,
        cursor: str | Unset = UNSET,
    ) -> GetYjsVersionsResponse:
        """Get Yjs version history

         This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
        are returned sorted by creation date, from newest to oldest.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            limit (int | Unset): A limit on the number of versions to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            cursor (str | Unset): A cursor used for pagination. Get the value from the `nextCursor`
                response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetYjsVersionsResponse
        """

        from .api.yjs import get_yjs_versions

        return await get_yjs_versions._asyncio(
            room_id=room_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    async def get_yjs_version(
        self,
        room_id: str,
        version_id: str,
    ) -> File:
        """Get Yjs document version

         This endpoint returns a specific version of the room's Yjs document encoded as a binary Yjs update.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            version_id (str): ID of the version Example: vh_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            File
        """

        from .api.yjs import get_yjs_version

        return await get_yjs_version._asyncio(
            room_id=room_id,
            version_id=version_id,
            client=self._client,
        )

    async def create_yjs_version(
        self,
        room_id: str,
    ) -> CreateYjsVersionResponse:
        """Create Yjs version snapshot

         This endpoint creates a new version history snapshot for the room's Yjs document.

        Args:
            room_id (str): ID of the room Example: my-room-id.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CreateYjsVersionResponse
        """

        from .api.yjs import create_yjs_version

        return await create_yjs_version._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def get_threads(
        self,
        room_id: str,
        *,
        query: str | Unset = UNSET,
    ) -> GetThreadsResponse:
        """Get room threads

         This endpoint returns the threads in the requested room. Corresponds to
        [`liveblocks.getThreads`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        threads).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            query (str | Unset): Query to filter threads. You can filter by `metadata` and `resolved`,
                for example, `metadata["status"]:"open" AND metadata["color"]:"red" AND resolved:true`.
                Learn more about [filtering threads with query
                language](https://liveblocks.io/docs/guides/how-to-filter-threads-using-query-language).
                Example: metadata["color"]:"blue".

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetThreadsResponse
        """

        from .api.comments import get_threads

        return await get_threads._asyncio(
            room_id=room_id,
            query=query,
            client=self._client,
        )

    async def create_thread(
        self,
        room_id: str,
        *,
        body: CreateThreadRequestBody,
    ) -> Thread:
        r"""Create thread

         This endpoint creates a new thread and the first comment in the thread. Corresponds to
        [`liveblocks.createThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads).

        A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
        construct a comment’s body, which can be submitted under `comment.body`.

        ```json
        {
          \"version\": 1,
          \"content\": [
            {
              \"type\": \"paragraph\",
              \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
            }
          ]
        }
        ```

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (CreateThreadRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import create_thread

        return await create_thread._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_thread(
        self,
        room_id: str,
        thread_id: str,
    ) -> Thread:
        """Get thread

         This endpoint returns a thread by its ID. Corresponds to
        [`liveblocks.getThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        threads-threadId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import get_thread

        return await get_thread._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def delete_thread(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        """Delete thread

         This endpoint deletes a thread by its ID. Corresponds to
        [`liveblocks.deleteThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-
        roomId-threads-threadId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import delete_thread

        return await delete_thread._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def edit_thread_metadata(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: EditThreadMetadataRequestBody,
    ) -> ThreadMetadata:
        """Edit thread metadata

         This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
        store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
        property to `null` to remove it. Corresponds to
        [`liveblocks.editThreadMetadata`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-metadata).

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (EditThreadMetadataRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            ThreadMetadata
        """

        from .api.comments import edit_thread_metadata

        return await edit_thread_metadata._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def mark_thread_as_resolved(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: MarkThreadAsResolvedRequestBody,
    ) -> Thread:
        """Mark thread as resolved

         This endpoint marks a thread as resolved. The request body must include a `userId` to identify who
        resolved the thread. Returns the updated thread. Corresponds to
        [`liveblocks.markThreadAsResolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-mark-as-resolved).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (MarkThreadAsResolvedRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import mark_thread_as_resolved

        return await mark_thread_as_resolved._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def mark_thread_as_unresolved(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: MarkThreadAsUnresolvedRequestBody,
    ) -> Thread:
        """Mark thread as unresolved

         This endpoint marks a thread as unresolved. The request body must include a `userId` to identify who
        unresolved the thread. Returns the updated thread. Corresponds to
        [`liveblocks.markThreadAsUnresolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-mark-as-unresolved).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (MarkThreadAsUnresolvedRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Thread
        """

        from .api.comments import mark_thread_as_unresolved

        return await mark_thread_as_unresolved._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def subscribe_to_thread(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: SubscribeToThreadRequestBody,
    ) -> Subscription:
        """Subscribe to thread

         This endpoint subscribes to a thread. Corresponds to
        [`liveblocks.subscribeToThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-subscribe).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (SubscribeToThreadRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Subscription
        """

        from .api.comments import subscribe_to_thread

        return await subscribe_to_thread._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def unsubscribe_from_thread(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: UnsubscribeFromThreadRequestBody,
    ) -> None:
        """Unsubscribe from thread

         This endpoint unsubscribes from a thread. Corresponds to
        [`liveblocks.unsubscribeFromThread`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-unsubscribe).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (UnsubscribeFromThreadRequestBody):  Example: {'userId': 'alice'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import unsubscribe_from_thread

        return await unsubscribe_from_thread._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def get_thread_subscriptions(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetThreadSubscriptionsResponse:
        """Get thread subscriptions

         This endpoint gets the list of subscriptions to a thread. Corresponds to
        [`liveblocks.getThreadSubscriptions`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        rooms-roomId-threads-threadId-subscriptions).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetThreadSubscriptionsResponse
        """

        from .api.comments import get_thread_subscriptions

        return await get_thread_subscriptions._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def create_comment(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: CreateCommentRequestBody,
    ) -> Comment:
        r"""Create comment

         This endpoint creates a new comment, adding it as a reply to a thread. Corresponds to
        [`liveblocks.createComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads-threadId-comments).

        A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
        construct a comment’s body, which can be submitted under `body`.

        ```json
        {
          \"version\": 1,
          \"content\": [
            {
              \"type\": \"paragraph\",
              \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
            }
          ]
        }
        ```

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            body (CreateCommentRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Comment
        """

        from .api.comments import create_comment

        return await create_comment._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def get_comment(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> Comment:
        """Get comment

         This endpoint returns a comment by its ID. Corresponds to
        [`liveblocks.getComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        threads-threadId-comments-commentId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Comment
        """

        from .api.comments import get_comment

        return await get_comment._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    async def edit_comment(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: EditCommentRequestBody,
    ) -> Comment:
        r"""Edit comment

         This endpoint edits the specified comment. Corresponds to
        [`liveblocks.editComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads-threadId-comments-commentId).

        A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
        construct a comment’s body, which can be submitted under `body`.

        ```json
        {
          \"version\": 1,
          \"content\": [
            {
              \"type\": \"paragraph\",
              \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
            }
          ]
        }
        ```

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (EditCommentRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Comment
        """

        from .api.comments import edit_comment

        return await edit_comment._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def delete_comment(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> None:
        """Delete comment

         This endpoint deletes a comment. A deleted comment is no longer accessible from the API or the
        dashboard and it cannot be restored. Corresponds to
        [`liveblocks.deleteComment`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-threads-threadId-comments-commentId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import delete_comment

        return await delete_comment._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    async def add_comment_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: AddCommentReactionRequestBody,
    ) -> CommentReaction:
        """Add comment reaction

         This endpoint adds a reaction to a comment. Corresponds to
        [`liveblocks.addCommentReaction`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-comments-commentId-add-reaction).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (AddCommentReactionRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CommentReaction
        """

        from .api.comments import add_comment_reaction

        return await add_comment_reaction._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def remove_comment_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: RemoveCommentReactionRequestBody,
    ) -> None:
        """Remove comment reaction

         This endpoint removes a comment reaction. A deleted comment reaction is no longer accessible from
        the API or the dashboard and it cannot be restored. Corresponds to
        [`liveblocks.removeCommentReaction`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-comments-commentId-add-reaction).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (RemoveCommentReactionRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.comments import remove_comment_reaction

        return await remove_comment_reaction._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def get_attachment(
        self,
        room_id: str,
        attachment_id: str,
    ) -> AttachmentWithUrl:
        """Get attachment

         Gets an attachment's metadata and a presigned download URL. The URL expires after 1 hour.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            attachment_id (str): ID of the attachment Example: at_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AttachmentWithUrl
        """

        from .api.comments import get_attachment

        return await get_attachment._asyncio(
            room_id=room_id,
            attachment_id=attachment_id,
            client=self._client,
        )

    async def edit_comment_metadata(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: EditCommentMetadataRequestBody,
    ) -> CommentMetadata:
        """Edit comment metadata

         This endpoint edits the metadata of a comment. The metadata is a JSON object that can be used to
        store any information you want about the comment, in `string`, `number`, or `boolean` form. Set a
        property to `null` to remove it. Corresponds to
        [`liveblocks.editCommentMetadata`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-threads-threadId-comments-commentId-metadata).

        `metadata` supports maximum 50 entries. Key length has a limit of 40 characters maximum. Value
        length has a limit of 4000 characters maximum for strings.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.
            comment_id (str): ID of the comment Example: cm_abc123.
            body (EditCommentMetadataRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CommentMetadata
        """

        from .api.comments import edit_comment_metadata

        return await edit_comment_metadata._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def get_thread_inbox_notifications(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetThreadInboxNotificationsResponse:
        """Get thread inbox notifications

         This endpoint returns the inbox notifications associated with a specific thread. Because this
        endpoint is not user-scoped, each notification includes a `userId` field identifying which user the
        notification belongs to. Only thread-kind notifications are returned.

        Args:
            room_id (str): ID of the room Example: my-room-id.
            thread_id (str): ID of the thread Example: th_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetThreadInboxNotificationsResponse
        """

        from .api.comments import get_thread_inbox_notifications

        return await get_thread_inbox_notifications._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def get_feeds(
        self,
        room_id: str,
        *,
        cursor: str | Unset = UNSET,
        since: int | Unset = UNSET,
        limit: int | Unset = 20,
    ) -> GetFeedsResponse:
        """Get room feeds

         This endpoint returns the feeds in the requested room. Corresponds to
        [`liveblocks.getFeeds`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        feeds).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            cursor (str | Unset): A cursor used for pagination. Get the value from the `nextCursor`
                response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            since (int | Unset): Only return feeds with `createdAt` greater than this Unix timestamp
                in milliseconds. Example: 1660000988137.
            limit (int | Unset): A limit on the number of feeds to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetFeedsResponse
        """

        from .api.feeds import get_feeds

        return await get_feeds._asyncio(
            room_id=room_id,
            cursor=cursor,
            since=since,
            limit=limit,
            client=self._client,
        )

    async def create_feed(
        self,
        room_id: str,
        *,
        body: CreateFeedRequestBody,
    ) -> Feed:
        """Create feed

         This endpoint creates a new feed in a room. Corresponds to
        [`liveblocks.createFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-
        roomId-feeds).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            body (CreateFeedRequestBody): Request body for `POST /v2/rooms/{roomId}/feeds`. Optional
                creation time is sent as `timestamp` (milliseconds), not `createdAt`.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Feed
        """

        from .api.feeds import create_feed

        return await create_feed._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_feed(
        self,
        room_id: str,
        feed_id: str,
    ) -> Feed:
        """Get feed

         This endpoint returns a feed by its ID. Corresponds to
        [`liveblocks.getFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-roomId-
        feeds-feedId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Feed
        """

        from .api.feeds import get_feed

        return await get_feed._asyncio(
            room_id=room_id,
            feed_id=feed_id,
            client=self._client,
        )

    async def delete_feed(
        self,
        room_id: str,
        feed_id: str,
    ) -> None:
        """Delete feed

         This endpoint deletes a feed. Corresponds to
        [`liveblocks.deleteFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-
        roomId-feeds-feedId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.feeds import delete_feed

        return await delete_feed._asyncio(
            room_id=room_id,
            feed_id=feed_id,
            client=self._client,
        )

    async def update_feed(
        self,
        room_id: str,
        feed_id: str,
        *,
        body: UpdateFeedRequestBody,
    ) -> Feed:
        """Update feed

         This endpoint updates the metadata of a feed. Corresponds to
        [`liveblocks.updateFeed`](https://liveblocks.io/docs/api-reference/liveblocks-node#patch-rooms-
        roomId-feeds-feedId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            body (UpdateFeedRequestBody):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Feed
        """

        from .api.feeds import update_feed

        return await update_feed._asyncio(
            room_id=room_id,
            feed_id=feed_id,
            body=body,
            client=self._client,
        )

    async def get_feed_messages(
        self,
        room_id: str,
        feed_id: str,
        *,
        cursor: str | Unset = UNSET,
        since: int | Unset = UNSET,
        limit: int | Unset = 20,
    ) -> GetFeedMessagesResponse:
        """Get feed messages

         This endpoint returns the messages in a feed. Corresponds to
        [`liveblocks.getFeedMessages`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms-
        roomId-feeds-feedId-messages).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            cursor (str | Unset): A cursor used for pagination. Get the value from the `nextCursor`
                response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            since (int | Unset): Only return messages with `createdAt` greater than this Unix
                timestamp in milliseconds. Example: 1660000988137.
            limit (int | Unset): A limit on the number of messages to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetFeedMessagesResponse
        """

        from .api.feeds import get_feed_messages

        return await get_feed_messages._asyncio(
            room_id=room_id,
            feed_id=feed_id,
            cursor=cursor,
            since=since,
            limit=limit,
            client=self._client,
        )

    async def create_feed_message(
        self,
        room_id: str,
        feed_id: str,
        *,
        body: CreateFeedMessageRequestBody,
    ) -> FeedMessage:
        """Create feed message

         This endpoint creates a new message in a feed. Corresponds to
        [`liveblocks.createFeedMessage`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-
        rooms-roomId-feeds-feedId-messages).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            body (CreateFeedMessageRequestBody): Request body for `POST
                /v2/rooms/{roomId}/feeds/{feedId}/messages`. Optional message time is sent as `timestamp`
                (milliseconds), not `createdAt`.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            FeedMessage
        """

        from .api.feeds import create_feed_message

        return await create_feed_message._asyncio(
            room_id=room_id,
            feed_id=feed_id,
            body=body,
            client=self._client,
        )

    async def delete_feed_message(
        self,
        room_id: str,
        feed_id: str,
        message_id: str,
    ) -> None:
        """Delete feed message

         This endpoint deletes a feed message. Corresponds to
        [`liveblocks.deleteFeedMessage`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-
        rooms-roomId-feeds-feedId-messages-messageId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            message_id (str): ID of the message Example: msg_xyz789.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.feeds import delete_feed_message

        return await delete_feed_message._asyncio(
            room_id=room_id,
            feed_id=feed_id,
            message_id=message_id,
            client=self._client,
        )

    async def update_feed_message(
        self,
        room_id: str,
        feed_id: str,
        message_id: str,
        *,
        body: UpdateFeedMessageRequestBody,
    ) -> FeedMessage:
        """Update feed message

         This endpoint updates a feed message. Corresponds to
        [`liveblocks.updateFeedMessage`](https://liveblocks.io/docs/api-reference/liveblocks-node#patch-
        rooms-roomId-feeds-feedId-messages-messageId).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            feed_id (str): ID of the feed Example: fd_abc123.
            message_id (str): ID of the message Example: msg_xyz789.
            body (UpdateFeedMessageRequestBody): Request body for `PATCH
                /v2/rooms/{roomId}/feeds/{feedId}/messages/{messageId}`. Optional update time is sent as
                `timestamp` (milliseconds), not `updatedAt`.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            FeedMessage
        """

        from .api.feeds import update_feed_message

        return await update_feed_message._asyncio(
            room_id=room_id,
            feed_id=feed_id,
            message_id=message_id,
            body=body,
            client=self._client,
        )

    async def authorize_user(
        self,
        *,
        body: AuthorizeUserRequestBody,
    ) -> AuthorizeUserResponse:
        r"""Get access token with secret key

         This endpoint lets your application server (your back end) obtain a token that one of its clients
        (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
        application’s custom authentication endpoint. When making this request, you’ll have to use your
        secret key.

        **Important:** The difference with an [ID token](#post-identify-user) is that an access token holds
        all the permissions, and is the source of truth. With ID tokens, permissions are set in the
        Liveblocks back end (through REST API calls) and \"checked at the door\" every time they are used to
        enter a room.

        **Note:** When using the `@liveblocks/node` package, you can use
        [`Liveblocks.prepareSession`](https://liveblocks.io/docs/api-reference/liveblocks-node#access-
        tokens) in your back end to build this request.

        You can pass the property `userId` in the request’s body. This can be whatever internal identifier
        you use for your user accounts as long as it uniquely identifies an account. The property `userId`
        is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
        corresponds to one MAU.

        Additionally, you can set custom metadata to the token, which will be publicly accessible by other
        clients through the `user.info` property. This is useful for storing static data like avatar images
        or the user’s display name.

        Lastly, you’ll specify the exact permissions to give to the user using the `permissions` field. This
        is done in an object where the keys are room names, or room name patterns (ending in a `*`), and a
        list of permissions to assign the user for any room that matches that name exactly (or starts with
        the pattern’s prefix). For tips, see [Manage permissions with access
        tokens](https://liveblocks.io/docs/authentication/access-token).

        Args:
            body (AuthorizeUserRequestBody):  Example: {'userId': 'user-123', 'userInfo': {'name':
                'bob', 'avatar': 'https://example.org/images/user123.jpg'}, 'organizationId': 'acme-corp',
                'permissions': {'my-room-1': ['room:write'], 'my-room-2': ['room:write'], 'my-room-*':
                ['room:read']}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AuthorizeUserResponse
        """

        from .api.auth import authorize_user

        return await authorize_user._asyncio(
            body=body,
            client=self._client,
        )

    async def identify_user(
        self,
        *,
        body: IdentifyUserRequestBody,
    ) -> IdentifyUserResponse:
        r"""Get ID token with secret key

         This endpoint lets your application server (your back end) obtain a token that one of its clients
        (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
        application’s custom authentication endpoint. When using this endpoint to obtain ID tokens, you
        should manage your permissions by assigning user and/or group permissions to rooms explicitly, see
        our [Manage permissions with ID tokens](https://liveblocks.io/docs/authentication/id-token) section.

        **Important:** The difference with an [access token](#post-authorize-user) is that an ID token
        doesn’t hold any permissions itself. With ID tokens, permissions are set in the Liveblocks back end
        (through REST API calls) and \"checked at the door\" every time they are used to enter a room. With
        access tokens, all permissions are set in the token itself, and thus controlled from your back end
        entirely.

        **Note:** When using the `@liveblocks/node` package, you can use
        [`Liveblocks.identifyUser`](https://liveblocks.io/docs/api-reference/liveblocks-node) in your back
        end to build this request.

        You can pass the property `userId` in the request’s body. This can be whatever internal identifier
        you use for your user accounts as long as it uniquely identifies an account. The property `userId`
        is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
        corresponds to one MAU.

        If you want to use group permissions, you can also declare which `groupIds` this user belongs to.
        The group ID values are yours, but they will have to match the group IDs you assign permissions to
        when assigning permissions to rooms, see [Manage permissions with ID
        tokens](https://liveblocks.io/docs/authentication/id-token)).

        Additionally, you can set custom metadata to the token, which will be publicly accessible by other
        clients through the `user.info` property. This is useful for storing static data like avatar images
        or the user’s display name.

        Args:
            body (IdentifyUserRequestBody):  Example: {'userId': 'user-123', 'organizationId': 'acme-
                corp', 'groupIds': ['marketing', 'engineering'], 'userInfo': {'name': 'bob', 'avatar':
                'https://example.org/images/user123.jpg'}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            IdentifyUserResponse
        """

        from .api.auth import identify_user

        return await identify_user._asyncio(
            body=body,
            client=self._client,
        )

    async def get_inbox_notification(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> InboxNotificationCustomData | InboxNotificationThreadData:
        """Get inbox notification

         This endpoint returns a user’s inbox notification by its ID. Corresponds to
        [`liveblocks.getInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        users-userId-inboxNotifications-inboxNotificationId).

        Args:
            user_id (str): ID of the user Example: user-123.
            inbox_notification_id (str): ID of the inbox notification Example: in_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            InboxNotificationCustomData | InboxNotificationThreadData
        """

        from .api.notifications import get_inbox_notification

        return await get_inbox_notification._asyncio(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    async def delete_inbox_notification(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> None:
        """Delete inbox notification

         This endpoint deletes a user’s inbox notification by its ID. Corresponds to
        [`liveblocks.deleteInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-users-userId-inbox-notifications-inboxNotificationId).

        Args:
            user_id (str): ID of the user Example: user-123.
            inbox_notification_id (str): ID of the inbox notification Example: in_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_inbox_notification

        return await delete_inbox_notification._asyncio(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    async def get_inbox_notifications(
        self,
        user_id: str,
        *,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        limit: int | Unset = 50,
        starting_after: str | Unset = UNSET,
    ) -> GetInboxNotificationsResponse:
        """Get all inbox notifications

         This endpoint returns all the user’s inbox notifications. Corresponds to
        [`liveblocks.getInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        users-userId-inboxNotifications).

        Args:
            user_id (str): ID of the user Example: user-123.
            organization_id (str | Unset): The organization ID to filter notifications for. Example:
                org_123456789.
            query (str | Unset): Query to filter notifications. You can filter by `unread`, for
                example, `unread:true`. Example: metadata["color"]:"blue".
            limit (int | Unset): A limit on the number of inbox notifications to be returned. The
                limit can range between 1 and 50, and defaults to 50. Default: 50. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetInboxNotificationsResponse
        """

        from .api.notifications import get_inbox_notifications

        return await get_inbox_notifications._asyncio(
            user_id=user_id,
            organization_id=organization_id,
            query=query,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def delete_all_inbox_notifications(
        self,
        user_id: str,
    ) -> None:
        """Delete all inbox notifications

         This endpoint deletes all the user’s inbox notifications. Corresponds to
        [`liveblocks.deleteAllInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-users-userId-inbox-notifications).

        Args:
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_all_inbox_notifications

        return await delete_all_inbox_notifications._asyncio(
            user_id=user_id,
            client=self._client,
        )

    async def get_notification_settings(
        self,
        user_id: str,
    ) -> NotificationSettings:
        """Get notification settings

         This endpoint returns a user's notification settings for the project. Corresponds to
        [`liveblocks.getNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        users-userId-notification-settings).

        Args:
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            NotificationSettings
        """

        from .api.notifications import get_notification_settings

        return await get_notification_settings._asyncio(
            user_id=user_id,
            client=self._client,
        )

    async def update_notification_settings(
        self,
        user_id: str,
        *,
        body: UpdateNotificationSettingsRequestBody,
    ) -> NotificationSettings:
        """Update notification settings

         This endpoint updates a user's notification settings for the project. Corresponds to
        [`liveblocks.updateNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#post-users-userId-notification-settings).

        Args:
            user_id (str): ID of the user Example: user-123.
            body (UpdateNotificationSettingsRequestBody): Partial notification settings - all
                properties are optional Example: {'email': {'thread': True, 'textMention': False},
                'slack': {'textMention': False}, 'webPush': {'thread': True}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            NotificationSettings
        """

        from .api.notifications import update_notification_settings

        return await update_notification_settings._asyncio(
            user_id=user_id,
            body=body,
            client=self._client,
        )

    async def delete_notification_settings(
        self,
        user_id: str,
    ) -> None:
        """Delete notification settings

         This endpoint deletes a user's notification settings for the project. Corresponds to
        [`liveblocks.deleteNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-users-userId-notification-settings).

        Args:
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_notification_settings

        return await delete_notification_settings._asyncio(
            user_id=user_id,
            client=self._client,
        )

    async def get_room_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        """Get room subscription settings

         This endpoint returns a user’s subscription settings for a specific room. Corresponds to
        [`liveblocks.getRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-rooms-roomId-users-userId-subscription-settings).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            RoomSubscriptionSettings
        """

        from .api.notifications import get_room_subscription_settings

        return await get_room_subscription_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def update_room_subscription_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: UpdateRoomSubscriptionSettingsRequestBody,
    ) -> RoomSubscriptionSettings:
        """Update room subscription settings

         This endpoint updates a user’s subscription settings for a specific room. Corresponds to
        [`liveblocks.updateRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#post-rooms-roomId-users-userId-subscription-settings).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            user_id (str): ID of the user Example: user-123.
            body (UpdateRoomSubscriptionSettingsRequestBody): Partial room subscription settings - all
                properties are optional Example: {'threads': 'replies_and_mentions', 'textMentions':
                'none'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            RoomSubscriptionSettings
        """

        from .api.notifications import update_room_subscription_settings

        return await update_room_subscription_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    async def delete_room_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> None:
        """Delete room subscription settings

         This endpoint deletes a user’s subscription settings for a specific room. Corresponds to
        [`liveblocks.deleteRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-rooms-roomId-users-userId-subscription-settings).

        Args:
            room_id (str): ID of the room Example: my-room-id.
            user_id (str): ID of the user Example: user-123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import delete_room_subscription_settings

        return await delete_room_subscription_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def get_user_room_subscription_settings(
        self,
        user_id: str,
        *,
        starting_after: str | Unset = UNSET,
        limit: int | Unset = 50,
        organization_id: str | Unset = UNSET,
    ) -> GetRoomSubscriptionSettingsResponse:
        """Get user room subscription settings

         This endpoint returns the list of a user's room subscription settings. Corresponds to
        [`liveblocks.getUserRoomSubscriptionSettings`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-users-userId-room-subscription-settings).

        Args:
            user_id (str): ID of the user Example: user-123.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.
            limit (int | Unset): A limit on the number of elements to be returned. The limit can range
                between 1 and 50, and defaults to 50. Default: 50. Example: 20.
            organization_id (str | Unset): The organization ID to filter room subscription settings
                for. Example: org_123456789.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetRoomSubscriptionSettingsResponse
        """

        from .api.notifications import get_user_room_subscription_settings

        return await get_user_room_subscription_settings._asyncio(
            user_id=user_id,
            starting_after=starting_after,
            limit=limit,
            organization_id=organization_id,
            client=self._client,
        )

    async def trigger_inbox_notification(
        self,
        *,
        body: TriggerInboxNotificationRequestBody,
    ) -> None:
        """Trigger inbox notification

         This endpoint triggers an inbox notification. Corresponds to
        [`liveblocks.triggerInboxNotification`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#post-inbox-notifications-trigger).

        Args:
            body (TriggerInboxNotificationRequestBody):  Example: {'userId': 'alice', 'kind':
                '$fileUploaded', 'subjectId': 'file123', 'activityData': {'url': 'url-to-file'}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import trigger_inbox_notification

        return await trigger_inbox_notification._asyncio(
            body=body,
            client=self._client,
        )

    async def mark_inbox_notification_as_read(
        self,
        inbox_notification_id: str,
    ) -> None:
        """Mark inbox notification as read

         This endpoint marks a specific inbox notification as read.

        Args:
            inbox_notification_id (str): ID of the inbox notification Example: in_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.notifications import mark_inbox_notification_as_read

        return await mark_inbox_notification_as_read._asyncio(
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    async def get_groups(
        self,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetGroupsResponse:
        """Get groups

         This endpoint returns a list of all groups in your project. Corresponds to
        [`liveblocks.getGroups`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-groups).

        Args:
            limit (int | Unset): A limit on the number of groups to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetGroupsResponse
        """

        from .api.groups import get_groups

        return await get_groups._asyncio(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def create_group(
        self,
        *,
        body: CreateGroupRequestBody,
    ) -> Group:
        """Create group

         This endpoint creates a new group. Corresponds to
        [`liveblocks.createGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-group).

        Args:
            body (CreateGroupRequestBody):  Example: {'id': 'engineering', 'memberIds': ['alice',
                'bob'], 'organizationId': 'org_123456789', 'scopes': {'mention': True}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import create_group

        return await create_group._asyncio(
            body=body,
            client=self._client,
        )

    async def get_group(
        self,
        group_id: str,
    ) -> Group:
        """Get group

         This endpoint returns a specific group by ID. Corresponds to
        [`liveblocks.getGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-group).

        Args:
            group_id (str): The ID of the group to retrieve. Example: engineering.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import get_group

        return await get_group._asyncio(
            group_id=group_id,
            client=self._client,
        )

    async def delete_group(
        self,
        group_id: str,
    ) -> None:
        """Delete group

         This endpoint deletes a group. Corresponds to
        [`liveblocks.deleteGroup`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-group).

        Args:
            group_id (str): The ID of the group to delete. Example: engineering.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.groups import delete_group

        return await delete_group._asyncio(
            group_id=group_id,
            client=self._client,
        )

    async def add_group_members(
        self,
        group_id: str,
        *,
        body: AddGroupMembersRequestBody,
    ) -> Group:
        """Add group members

         This endpoint adds new members to an existing group. Corresponds to
        [`liveblocks.addGroupMembers`](https://liveblocks.io/docs/api-reference/liveblocks-node#add-group-
        members).

        Args:
            group_id (str): The ID of the group to add members to. Example: engineering.
            body (AddGroupMembersRequestBody):  Example: {'memberIds': ['charlie', 'dave']}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import add_group_members

        return await add_group_members._asyncio(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    async def remove_group_members(
        self,
        group_id: str,
        *,
        body: RemoveGroupMembersRequestBody,
    ) -> Group:
        """Remove group members

         This endpoint removes members from an existing group. Corresponds to
        [`liveblocks.removeGroupMembers`](https://liveblocks.io/docs/api-reference/liveblocks-node#remove-
        group-members).

        Args:
            group_id (str): The ID of the group to remove members from. Example: engineering.
            body (RemoveGroupMembersRequestBody):  Example: {'memberIds': ['charlie']}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            Group
        """

        from .api.groups import remove_group_members

        return await remove_group_members._asyncio(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    async def get_user_groups(
        self,
        user_id: str,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetUserGroupsResponse:
        """Get user groups

         This endpoint returns all groups that a specific user is a member of. Corresponds to
        [`liveblocks.getUserGroups`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-user-
        groups).

        Args:
            user_id (str): The ID of the user to get groups for. Example: user-123.
            limit (int | Unset): A limit on the number of groups to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetUserGroupsResponse
        """

        from .api.groups import get_user_groups

        return await get_user_groups._asyncio(
            user_id=user_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def get_ai_copilots(
        self,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetAiCopilotsResponse:
        """Get AI copilots

         This endpoint returns a paginated list of AI copilots. The copilots are returned sorted by creation
        date, from newest to oldest. Corresponds to
        [`liveblocks.getAiCopilots`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-ai-
        copilots).

        Args:
            limit (int | Unset): A limit on the number of copilots to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetAiCopilotsResponse
        """

        from .api.ai import get_ai_copilots

        return await get_ai_copilots._asyncio(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def create_ai_copilot(
        self,
        *,
        body: CreateAiCopilotOptionsAnthropic
        | CreateAiCopilotOptionsGoogle
        | CreateAiCopilotOptionsOpenAi
        | CreateAiCopilotOptionsOpenAiCompatible,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
        """Create AI copilot

         This endpoint creates a new AI copilot with the given configuration. Corresponds to
        [`liveblocks.createAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#create-ai-
        copilot).

        Args:
            body (CreateAiCopilotOptionsAnthropic | CreateAiCopilotOptionsGoogle |
                CreateAiCopilotOptionsOpenAi | CreateAiCopilotOptionsOpenAiCompatible):  Example: {'name':
                'My Copilot', 'systemPrompt': 'You are a helpful assistant.', 'providerApiKey': 'sk-...',
                'provider': 'openai', 'providerModel': 'gpt-4o'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
        """

        from .api.ai import create_ai_copilot

        return await create_ai_copilot._asyncio(
            body=body,
            client=self._client,
        )

    async def get_ai_copilot(
        self,
        copilot_id: str,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
        """Get AI copilot

         This endpoint returns an AI copilot by its ID. Corresponds to
        [`liveblocks.getAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-ai-
        copilot).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
        """

        from .api.ai import get_ai_copilot

        return await get_ai_copilot._asyncio(
            copilot_id=copilot_id,
            client=self._client,
        )

    async def update_ai_copilot(
        self,
        copilot_id: str,
        *,
        body: UpdateAiCopilotRequestBody,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
        r"""Update AI copilot

         This endpoint updates an existing AI copilot's configuration. Corresponds to
        [`liveblocks.updateAiCopilot`](https://liveblocks.io/docs/api-reference/liveblocks-node#update-ai-
        copilot).

        This endpoint returns a 422 response if the update doesn't apply due to validation failures. For
        example, if the existing copilot uses the \"openai\" provider and you attempt to update the provider
        model to an incompatible value for the provider, like \"gemini-2.5-pro\", you'll receive a 422
        response with an error message explaining where the validation failed.

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            body (UpdateAiCopilotRequestBody):  Example: {'name': 'Updated Copilot', 'systemPrompt':
                'You are an updated helpful assistant.', 'providerModel': 'gpt-4o', 'settings':
                {'maxTokens': 8192}}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible
        """

        from .api.ai import update_ai_copilot

        return await update_ai_copilot._asyncio(
            copilot_id=copilot_id,
            body=body,
            client=self._client,
        )

    async def delete_ai_copilot(
        self,
        copilot_id: str,
    ) -> None:
        """Delete AI copilot

         This endpoint deletes an AI copilot by its ID. A deleted copilot is no longer accessible and cannot
        be restored. Corresponds to [`liveblocks.deleteAiCopilot`](https://liveblocks.io/docs/api-
        reference/liveblocks-node#delete-ai-copilot).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.ai import delete_ai_copilot

        return await delete_ai_copilot._asyncio(
            copilot_id=copilot_id,
            client=self._client,
        )

    async def get_knowledge_sources(
        self,
        copilot_id: str,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetKnowledgeSourcesResponse:
        """Get knowledge sources

         This endpoint returns a paginated list of knowledge sources for a specific AI copilot. Corresponds
        to [`liveblocks.getKnowledgeSources`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        knowledge-sources).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            limit (int | Unset): A limit on the number of knowledge sources to be returned. The limit
                can range between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetKnowledgeSourcesResponse
        """

        from .api.ai import get_knowledge_sources

        return await get_knowledge_sources._asyncio(
            copilot_id=copilot_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def get_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> KnowledgeSourceFileSource | KnowledgeSourceWebSource:
        """Get knowledge source

         This endpoint returns a specific knowledge source by its ID. Corresponds to
        [`liveblocks.getKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-
        knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            KnowledgeSourceFileSource | KnowledgeSourceWebSource
        """

        from .api.ai import get_knowledge_source

        return await get_knowledge_source._asyncio(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    async def create_web_knowledge_source(
        self,
        copilot_id: str,
        *,
        body: CreateWebKnowledgeSourceRequestBody,
    ) -> CreateWebKnowledgeSourceResponse:
        """Create web knowledge source

         This endpoint creates a web knowledge source for an AI copilot. This allows the copilot to access
        and learn from web content. Corresponds to
        [`liveblocks.createWebKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#create-web-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            body (CreateWebKnowledgeSourceRequestBody):  Example: {'copilotId': 'cp_abc123', 'url':
                'https://docs.example.com', 'type': 'crawl'}.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CreateWebKnowledgeSourceResponse
        """

        from .api.ai import create_web_knowledge_source

        return await create_web_knowledge_source._asyncio(
            copilot_id=copilot_id,
            body=body,
            client=self._client,
        )

    async def create_file_knowledge_source(
        self,
        copilot_id: str,
        name: str,
        *,
        body: File,
    ) -> CreateFileKnowledgeSourceResponse:
        """Create file knowledge source

         This endpoint creates a file knowledge source for an AI copilot by uploading a file. The copilot can
        then reference the content of the file when responding. Corresponds to
        [`liveblocks.createFileKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#create-file-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            name (str): Name of the file Example: document.pdf.
            body (File):

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            CreateFileKnowledgeSourceResponse
        """

        from .api.ai import create_file_knowledge_source

        return await create_file_knowledge_source._asyncio(
            copilot_id=copilot_id,
            name=name,
            body=body,
            client=self._client,
        )

    async def get_file_knowledge_source_markdown(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> GetFileKnowledgeSourceMarkdownResponse:
        """Get file knowledge source content

         This endpoint returns the content of a file knowledge source as markdown. This allows you to see
        what content the AI copilot has access to from uploaded files. Corresponds to
        [`liveblocks.getFileKnowledgeSourceMarkdown`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-file-knowledge-source-markdown).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetFileKnowledgeSourceMarkdownResponse
        """

        from .api.ai import get_file_knowledge_source_markdown

        return await get_file_knowledge_source_markdown._asyncio(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    async def delete_file_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> None:
        """Delete file knowledge source

         This endpoint deletes a file knowledge source from an AI copilot. The copilot will no longer have
        access to the content from this file. Corresponds to
        [`liveblocks.deleteFileKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-file-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.ai import delete_file_knowledge_source

        return await delete_file_knowledge_source._asyncio(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    async def delete_web_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> None:
        """Delete web knowledge source

         This endpoint deletes a web knowledge source from an AI copilot. The copilot will no longer have
        access to the content from this source. Corresponds to
        [`liveblocks.deleteWebKnowledgeSource`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#delete-web-knowledge-source).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            None
        """

        from .api.ai import delete_web_knowledge_source

        return await delete_web_knowledge_source._asyncio(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    async def get_web_knowledge_source_links(
        self,
        copilot_id: str,
        knowledge_source_id: str,
        *,
        limit: int | Unset = 20,
        starting_after: str | Unset = UNSET,
    ) -> GetWebKnowledgeSourceLinksResponse:
        """Get web knowledge source links

         This endpoint returns a paginated list of links that were indexed from a web knowledge source. This
        is useful for understanding what content the AI copilot has access to from web sources. Corresponds
        to [`liveblocks.getWebKnowledgeSourceLinks`](https://liveblocks.io/docs/api-reference/liveblocks-
        node#get-web-knowledge-source-links).

        Args:
            copilot_id (str): ID of the AI copilot Example: cp_abc123.
            knowledge_source_id (str): ID of the knowledge source Example: ks_abc123.
            limit (int | Unset): A limit on the number of links to be returned. The limit can range
                between 1 and 100, and defaults to 20. Default: 20. Example: 20.
            starting_after (str | Unset): A cursor used for pagination. Get the value from the
                `nextCursor` response of the previous page. Example: eyJjcmVhdGVkQXQiOjE2NjAwMDA5ODgxMzd9.

        Raises:
            errors.LiveblocksError: If the server returns a response with non-2xx status code.
            httpx.TimeoutException: If the request takes longer than Client.timeout.

        Returns:
            GetWebKnowledgeSourceLinksResponse
        """

        from .api.ai import get_web_knowledge_source_links

        return await get_web_knowledge_source_links._asyncio(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )
