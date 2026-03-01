from __future__ import annotations

import re
from typing import TYPE_CHECKING, Any

import httpx

from .types import UNSET, File, Unset

if TYPE_CHECKING:
    from session import AsyncSession, Session

    from .models.active_users_response import ActiveUsersResponse
    from .models.add_comment_reaction import AddCommentReaction
    from .models.add_group_members import AddGroupMembers
    from .models.ai_copilot_type_0 import AiCopilotType0
    from .models.ai_copilot_type_1 import AiCopilotType1
    from .models.ai_copilot_type_2 import AiCopilotType2
    from .models.ai_copilot_type_3 import AiCopilotType3
    from .models.an_http_response_body_containing_a_token import AnHTTPResponseBodyContainingAToken
    from .models.authorization import Authorization
    from .models.authorize_user_request import AuthorizeUserRequest
    from .models.comment import Comment
    from .models.comment_metadata import CommentMetadata
    from .models.comment_reaction import CommentReaction
    from .models.create_ai_copilot import CreateAiCopilot
    from .models.create_authorization import CreateAuthorization
    from .models.create_file_knowledge_source_response_200 import CreateFileKnowledgeSourceResponse200
    from .models.create_group import CreateGroup
    from .models.create_management_project import CreateManagementProject
    from .models.create_management_webhook import CreateManagementWebhook
    from .models.create_room import CreateRoom
    from .models.create_thread import CreateThread
    from .models.create_web_knowledge_source import CreateWebKnowledgeSource
    from .models.create_web_knowledge_source_response_200 import CreateWebKnowledgeSourceResponse200
    from .models.create_yjs_version import CreateYjsVersion
    from .models.file_knowledge_source import FileKnowledgeSource
    from .models.get_ai_copilots import GetAiCopilots
    from .models.get_file_knowledge_source_content_response_200 import GetFileKnowledgeSourceContentResponse200
    from .models.get_groups import GetGroups
    from .models.get_knowledge_sources import GetKnowledgeSources
    from .models.get_rooms import GetRooms
    from .models.get_rooms_room_id_storage_format import GetRoomsRoomIdStorageFormat
    from .models.get_rooms_room_id_storage_response_200 import GetRoomsRoomIdStorageResponse200
    from .models.get_rooms_room_id_threads_thread_id_participants_response_200 import (
        GetRoomsRoomIdThreadsThreadIdParticipantsResponse200,
    )
    from .models.get_rooms_room_id_threads_thread_id_subscriptions_response_200 import (
        GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200,
    )
    from .models.get_rooms_room_id_ydoc_response_200 import GetRoomsRoomIdYdocResponse200
    from .models.get_rooms_room_id_ydoc_type import GetRoomsRoomIdYdocType
    from .models.get_user_groups import GetUserGroups
    from .models.get_users_user_id_subscription_settings_response_200 import (
        GetUsersUserIdSubscriptionSettingsResponse200,
    )
    from .models.get_yjs_versions import GetYjsVersions
    from .models.group import Group
    from .models.identify_user_request import IdentifyUserRequest
    from .models.inbox_notification_custom_data import InboxNotificationCustomData
    from .models.inbox_notification_thread_data import InboxNotificationThreadData
    from .models.management_project_key_roll_request import ManagementProjectKeyRollRequest
    from .models.management_project_public_key_response import ManagementProjectPublicKeyResponse
    from .models.management_project_response import ManagementProjectResponse
    from .models.management_project_secret_key_response import ManagementProjectSecretKeyResponse
    from .models.management_projects_response import ManagementProjectsResponse
    from .models.management_webhook_headers_delete import ManagementWebhookHeadersDelete
    from .models.management_webhook_headers_patch import ManagementWebhookHeadersPatch
    from .models.management_webhook_headers_response import ManagementWebhookHeadersResponse
    from .models.management_webhook_recover_request import ManagementWebhookRecoverRequest
    from .models.management_webhook_response import ManagementWebhookResponse
    from .models.management_webhook_secret_rotate_response import ManagementWebhookSecretRotateResponse
    from .models.management_webhook_test_request import ManagementWebhookTestRequest
    from .models.management_webhook_test_response import ManagementWebhookTestResponse
    from .models.management_webhooks_response import ManagementWebhooksResponse
    from .models.notification_settings import NotificationSettings
    from .models.partial_notification_settings import PartialNotificationSettings
    from .models.patch_rooms_room_id_storage_json_patch_body_item import PatchRoomsRoomIdStorageJsonPatchBodyItem
    from .models.post_rooms_room_id_files_body import PostRoomsRoomIdFilesBody
    from .models.post_rooms_room_id_storage_body import PostRoomsRoomIdStorageBody
    from .models.post_rooms_room_id_storage_response_200 import PostRoomsRoomIdStorageResponse200
    from .models.post_rooms_room_id_threads_thread_id_subscribe_body import PostRoomsRoomIdThreadsThreadIdSubscribeBody
    from .models.post_rooms_room_id_threads_thread_id_unsubscribe_body import (
        PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
    )
    from .models.post_rooms_room_id_threads_thread_id_unsubscribe_response_200 import (
        PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200,
    )
    from .models.post_rooms_update_room_id_files_body import PostRoomsUpdateRoomIdFilesBody
    from .models.public_authorize_body_request import PublicAuthorizeBodyRequest
    from .models.remove_comment_reaction import RemoveCommentReaction
    from .models.remove_group_members import RemoveGroupMembers
    from .models.room import Room
    from .models.room_subscription_settings import RoomSubscriptionSettings
    from .models.set_presence import SetPresence
    from .models.subscription import Subscription
    from .models.thread_metadata import ThreadMetadata
    from .models.trigger_inbox_notification import TriggerInboxNotification
    from .models.update_ai_copilot import UpdateAiCopilot
    from .models.update_comment import UpdateComment
    from .models.update_comment_metadata import UpdateCommentMetadata
    from .models.update_management_project import UpdateManagementProject
    from .models.update_management_webhook import UpdateManagementWebhook
    from .models.update_room import UpdateRoom
    from .models.update_thread_metadata import UpdateThreadMetadata
    from .models.upsert_room import UpsertRoom
    from .models.upsert_rooms_room_id_files_body import UpsertRoomsRoomIdFilesBody
    from .models.web_knowledge_source import WebKnowledgeSource

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
    ) -> Session:
        from session import Session

        return Session(client=self, user_id=user_id)

    def get_rooms(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        user_id: str | Unset = UNSET,
        group_ids: str | Unset = UNSET,
    ) -> GetRooms:
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

    def post_rooms(
        self,
        *,
        body: CreateRoom | Unset = UNSET,
    ) -> Room:
        from .api.room import post_rooms

        return post_rooms._sync(
            body=body,
            client=self._client,
        )

    def get_rooms_room_id(
        self,
        room_id: str,
    ) -> Room:
        from .api.room import get_rooms_room_id

        return get_rooms_room_id._sync(
            room_id=room_id,
            client=self._client,
        )

    def post_rooms_room_id(
        self,
        room_id: str,
        *,
        body: UpdateRoom | PostRoomsRoomIdFilesBody | Unset = UNSET,
    ) -> Room:
        from .api.room import post_rooms_room_id

        return post_rooms_room_id._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def delete_rooms_room_id(
        self,
        room_id: str,
    ) -> Any:
        from .api.room import delete_rooms_room_id

        return delete_rooms_room_id._sync(
            room_id=room_id,
            client=self._client,
        )

    def get_rooms_room_id_prewarm(
        self,
        room_id: str,
    ) -> Any:
        from .api.room import get_rooms_room_id_prewarm

        return get_rooms_room_id_prewarm._sync(
            room_id=room_id,
            client=self._client,
        )

    def upsert_rooms_room_id(
        self,
        room_id: str,
        *,
        body: UpsertRoom | UpsertRoomsRoomIdFilesBody | Unset = UNSET,
    ) -> Room:
        from .api.room import upsert_rooms_room_id

        return upsert_rooms_room_id._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def post_rooms_update_room_id(
        self,
        room_id: str,
        *,
        body: PostRoomsUpdateRoomIdFilesBody | Unset = UNSET,
    ) -> Room:
        from .api.room import post_rooms_update_room_id

        return post_rooms_update_room_id._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_active_users(
        self,
        room_id: str,
    ) -> ActiveUsersResponse:
        from .api.room import get_rooms_room_id_active_users

        return get_rooms_room_id_active_users._sync(
            room_id=room_id,
            client=self._client,
        )

    def post_rooms_room_id_presence(
        self,
        room_id: str,
        *,
        body: SetPresence,
    ) -> Any:
        from .api.room import post_rooms_room_id_presence

        return post_rooms_room_id_presence._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_storage(
        self,
        room_id: str,
        *,
        format_: GetRoomsRoomIdStorageFormat | Unset = UNSET,
    ) -> GetRoomsRoomIdStorageResponse200:
        from .api.storage import get_rooms_room_id_storage

        return get_rooms_room_id_storage._sync(
            room_id=room_id,
            format_=format_,
            client=self._client,
        )

    def post_rooms_room_id_storage(
        self,
        room_id: str,
        *,
        body: PostRoomsRoomIdStorageBody | Unset = UNSET,
    ) -> PostRoomsRoomIdStorageResponse200:
        from .api.storage import post_rooms_room_id_storage

        return post_rooms_room_id_storage._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def delete_rooms_room_id_storage(
        self,
        room_id: str,
    ) -> Any:
        from .api.storage import delete_rooms_room_id_storage

        return delete_rooms_room_id_storage._sync(
            room_id=room_id,
            client=self._client,
        )

    def patch_rooms_room_id_storage_json_patch(
        self,
        room_id: str,
        *,
        body: list[PatchRoomsRoomIdStorageJsonPatchBodyItem],
    ) -> Any:
        from .api.storage import patch_rooms_room_id_storage_json_patch

        return patch_rooms_room_id_storage_json_patch._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_ydoc(
        self,
        room_id: str,
        *,
        formatting: bool | Unset = UNSET,
        key: str | Unset = UNSET,
        type_: GetRoomsRoomIdYdocType | Unset = UNSET,
    ) -> GetRoomsRoomIdYdocResponse200:
        from .api.yjs import get_rooms_room_id_ydoc

        return get_rooms_room_id_ydoc._sync(
            room_id=room_id,
            formatting=formatting,
            key=key,
            type_=type_,
            client=self._client,
        )

    def put_rooms_room_id_ydoc(
        self,
        room_id: str,
        *,
        body: File | Unset = UNSET,
        guid: str | Unset = UNSET,
    ) -> Any:
        from .api.yjs import put_rooms_room_id_ydoc

        return put_rooms_room_id_ydoc._sync(
            room_id=room_id,
            body=body,
            guid=guid,
            client=self._client,
        )

    def get_rooms_room_id_ydoc_binary(
        self,
        room_id: str,
        *,
        guid: str | Unset = UNSET,
    ) -> File:
        from .api.yjs import get_rooms_room_id_ydoc_binary

        return get_rooms_room_id_ydoc_binary._sync(
            room_id=room_id,
            guid=guid,
            client=self._client,
        )

    def get_rooms_room_id_versions(
        self,
        room_id: str,
        *,
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> GetYjsVersions:
        from .api.yjs import get_rooms_room_id_versions

        return get_rooms_room_id_versions._sync(
            room_id=room_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    def get_rooms_room_id_version_version_id(
        self,
        room_id: str,
        version_id: str,
    ) -> File:
        from .api.yjs import get_rooms_room_id_version_version_id

        return get_rooms_room_id_version_version_id._sync(
            room_id=room_id,
            version_id=version_id,
            client=self._client,
        )

    def post_rooms_room_id_version(
        self,
        room_id: str,
    ) -> CreateYjsVersion:
        from .api.yjs import post_rooms_room_id_version

        return post_rooms_room_id_version._sync(
            room_id=room_id,
            client=self._client,
        )

    def get_rooms_room_id_threads(
        self,
        room_id: str,
        *,
        query: str | Unset = UNSET,
    ) -> None:
        from .api.comments import get_rooms_room_id_threads

        return get_rooms_room_id_threads._sync(
            room_id=room_id,
            query=query,
            client=self._client,
        )

    def post_rooms_room_id_threads(
        self,
        room_id: str,
        *,
        body: CreateThread | Unset = UNSET,
    ) -> None:
        from .api.comments import post_rooms_room_id_threads

        return post_rooms_room_id_threads._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_threads_thread_id(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        from .api.comments import get_rooms_room_id_threads_thread_id

        return get_rooms_room_id_threads_thread_id._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def delete_rooms_room_id_threads_thread_id(
        self,
        room_id: str,
        thread_id: str,
    ) -> Any:
        from .api.comments import delete_rooms_room_id_threads_thread_id

        return delete_rooms_room_id_threads_thread_id._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_metadata(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: UpdateThreadMetadata | Unset = UNSET,
    ) -> ThreadMetadata:
        from .api.comments import post_rooms_room_id_threads_thread_id_metadata

        return post_rooms_room_id_threads_thread_id_metadata._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_mark_as_resolved(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        from .api.comments import post_rooms_room_id_threads_thread_id_mark_as_resolved

        return post_rooms_room_id_threads_thread_id_mark_as_resolved._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_mark_as_unresolved(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        from .api.comments import post_rooms_room_id_threads_thread_id_mark_as_unresolved

        return post_rooms_room_id_threads_thread_id_mark_as_unresolved._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_subscribe(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: PostRoomsRoomIdThreadsThreadIdSubscribeBody,
    ) -> Subscription:
        from .api.comments import post_rooms_room_id_threads_thread_id_subscribe

        return post_rooms_room_id_threads_thread_id_subscribe._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_unsubscribe(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
    ) -> PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200:
        from .api.comments import post_rooms_room_id_threads_thread_id_unsubscribe

        return post_rooms_room_id_threads_thread_id_unsubscribe._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_threads_thread_id_subscriptions(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200:
        from .api.comments import get_rooms_room_id_threads_thread_id_subscriptions

        return get_rooms_room_id_threads_thread_id_subscriptions._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_comments(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: UpdateComment | Unset = UNSET,
    ) -> Comment:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments

        return post_rooms_room_id_threads_thread_id_comments._sync(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_threads_thread_id_comments_comment_id(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> Comment:
        from .api.comments import get_rooms_room_id_threads_thread_id_comments_comment_id

        return get_rooms_room_id_threads_thread_id_comments_comment_id._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_comments_comment_id(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: UpdateComment | Unset = UNSET,
    ) -> UpdateComment:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id

        return post_rooms_room_id_threads_thread_id_comments_comment_id._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def delete_rooms_room_id_threads_thread_id_comments_comment_id(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> Any:
        from .api.comments import delete_rooms_room_id_threads_thread_id_comments_comment_id

        return delete_rooms_room_id_threads_thread_id_comments_comment_id._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_comments_comment_id_add_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: AddCommentReaction | Unset = UNSET,
    ) -> CommentReaction:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id_add_reaction

        return post_rooms_room_id_threads_thread_id_comments_comment_id_add_reaction._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_comments_comment_id_remove_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: RemoveCommentReaction | Unset = UNSET,
    ) -> Any:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id_remove_reaction

        return post_rooms_room_id_threads_thread_id_comments_comment_id_remove_reaction._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def post_rooms_room_id_threads_thread_id_comments_comment_id_metadata(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: UpdateCommentMetadata | Unset = UNSET,
    ) -> CommentMetadata:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id_metadata

        return post_rooms_room_id_threads_thread_id_comments_comment_id_metadata._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_threads_thread_id_participants(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetRoomsRoomIdThreadsThreadIdParticipantsResponse200:
        from .api.deprecated import get_rooms_room_id_threads_thread_id_participants

        return get_rooms_room_id_threads_thread_id_participants._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def post_authorize(
        self,
        room_id: str,
        *,
        body: CreateAuthorization | Unset = UNSET,
    ) -> Authorization:
        from .api.deprecated import post_authorize

        return post_authorize._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def post_public_authorize(
        self,
        room_id: str,
        *,
        body: PublicAuthorizeBodyRequest | Unset = UNSET,
    ) -> Authorization:
        from .api.deprecated import post_public_authorize

        return post_public_authorize._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_rooms_room_id_users_user_id_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import get_rooms_room_id_users_user_id_notification_settings

        return get_rooms_room_id_users_user_id_notification_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def post_rooms_room_id_users_user_id_notification_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: RoomSubscriptionSettings | Unset = UNSET,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import post_rooms_room_id_users_user_id_notification_settings

        return post_rooms_room_id_users_user_id_notification_settings._sync(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    def delete_rooms_room_id_users_user_id_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> Any:
        from .api.deprecated import delete_rooms_room_id_users_user_id_notification_settings

        return delete_rooms_room_id_users_user_id_notification_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def post_authorize_user(
        self,
        *,
        body: AuthorizeUserRequest | Unset = UNSET,
    ) -> AnHTTPResponseBodyContainingAToken:
        from .api.authentication import post_authorize_user

        return post_authorize_user._sync(
            body=body,
            client=self._client,
        )

    def post_identify_user(
        self,
        *,
        body: IdentifyUserRequest | Unset = UNSET,
    ) -> AnHTTPResponseBodyContainingAToken:
        from .api.authentication import post_identify_user

        return post_identify_user._sync(
            body=body,
            client=self._client,
        )

    def get_users_user_id_inbox_notifications_inbox_notification_id(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> InboxNotificationCustomData | InboxNotificationThreadData:
        from .api.notifications import get_users_user_id_inbox_notifications_inbox_notification_id

        return get_users_user_id_inbox_notifications_inbox_notification_id._sync(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    def delete_users_user_id_inbox_notifications_inbox_notification_id(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> Any:
        from .api.notifications import delete_users_user_id_inbox_notifications_inbox_notification_id

        return delete_users_user_id_inbox_notifications_inbox_notification_id._sync(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    def get_users_user_id_inbox_notifications(
        self,
        user_id: str,
        *,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        limit: float | Unset = 50.0,
        starting_after: str | Unset = UNSET,
    ) -> list[InboxNotificationCustomData | InboxNotificationThreadData]:
        from .api.notifications import get_users_user_id_inbox_notifications

        return get_users_user_id_inbox_notifications._sync(
            user_id=user_id,
            organization_id=organization_id,
            query=query,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def delete_users_user_id_inbox_notifications(
        self,
        user_id: str,
    ) -> Any:
        from .api.notifications import delete_users_user_id_inbox_notifications

        return delete_users_user_id_inbox_notifications._sync(
            user_id=user_id,
            client=self._client,
        )

    def get_users_user_id_notification_settings(
        self,
        user_id: str,
    ) -> NotificationSettings:
        from .api.notifications import get_users_user_id_notification_settings

        return get_users_user_id_notification_settings._sync(
            user_id=user_id,
            client=self._client,
        )

    def post_users_user_id_notification_settings(
        self,
        user_id: str,
        *,
        body: PartialNotificationSettings | Unset = UNSET,
    ) -> NotificationSettings:
        from .api.notifications import post_users_user_id_notification_settings

        return post_users_user_id_notification_settings._sync(
            user_id=user_id,
            body=body,
            client=self._client,
        )

    def delete_users_user_id_notification_settings(
        self,
        user_id: str,
    ) -> Any:
        from .api.notifications import delete_users_user_id_notification_settings

        return delete_users_user_id_notification_settings._sync(
            user_id=user_id,
            client=self._client,
        )

    def get_rooms_room_id_users_user_id_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        from .api.notifications import get_rooms_room_id_users_user_id_subscription_settings

        return get_rooms_room_id_users_user_id_subscription_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def post_rooms_room_id_users_user_id_subscription_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: RoomSubscriptionSettings | Unset = UNSET,
    ) -> RoomSubscriptionSettings:
        from .api.notifications import post_rooms_room_id_users_user_id_subscription_settings

        return post_rooms_room_id_users_user_id_subscription_settings._sync(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    def delete_rooms_room_id_users_user_id_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> Any:
        from .api.notifications import delete_rooms_room_id_users_user_id_subscription_settings

        return delete_rooms_room_id_users_user_id_subscription_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def get_users_user_id_subscription_settings(
        self,
        user_id: str,
        *,
        starting_after: str | Unset = UNSET,
        limit: float | Unset = 50.0,
    ) -> GetUsersUserIdSubscriptionSettingsResponse200:
        from .api.notifications import get_users_user_id_subscription_settings

        return get_users_user_id_subscription_settings._sync(
            user_id=user_id,
            starting_after=starting_after,
            limit=limit,
            client=self._client,
        )

    def post_inbox_notifications_trigger(
        self,
        *,
        body: TriggerInboxNotification | Unset = UNSET,
    ) -> Any:
        from .api.notifications import post_inbox_notifications_trigger

        return post_inbox_notifications_trigger._sync(
            body=body,
            client=self._client,
        )

    def get_groups(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetGroups:
        from .api.groups import get_groups

        return get_groups._sync(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def post_groups(
        self,
        *,
        body: CreateGroup | Unset = UNSET,
    ) -> Group:
        from .api.groups import post_groups

        return post_groups._sync(
            body=body,
            client=self._client,
        )

    def get_groups_group_id(
        self,
        group_id: str,
    ) -> Group:
        from .api.groups import get_groups_group_id

        return get_groups_group_id._sync(
            group_id=group_id,
            client=self._client,
        )

    def delete_groups_group_id(
        self,
        group_id: str,
    ) -> Any:
        from .api.groups import delete_groups_group_id

        return delete_groups_group_id._sync(
            group_id=group_id,
            client=self._client,
        )

    def post_groups_group_id_add_members(
        self,
        group_id: str,
        *,
        body: AddGroupMembers | Unset = UNSET,
    ) -> Group:
        from .api.groups import post_groups_group_id_add_members

        return post_groups_group_id_add_members._sync(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    def post_groups_group_id_remove_members(
        self,
        group_id: str,
        *,
        body: RemoveGroupMembers | Unset = UNSET,
    ) -> Group:
        from .api.groups import post_groups_group_id_remove_members

        return post_groups_group_id_remove_members._sync(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    def get_users_user_id_groups(
        self,
        user_id: str,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetUserGroups:
        from .api.groups import get_users_user_id_groups

        return get_users_user_id_groups._sync(
            user_id=user_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def get_ai_copilots(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetAiCopilots:
        from .api.ai import get_ai_copilots

        return get_ai_copilots._sync(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def create_ai_copilot(
        self,
        *,
        body: CreateAiCopilot | Unset = UNSET,
    ) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
        from .api.ai import create_ai_copilot

        return create_ai_copilot._sync(
            body=body,
            client=self._client,
        )

    def get_ai_copilot(
        self,
        copilot_id: str,
    ) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
        from .api.ai import get_ai_copilot

        return get_ai_copilot._sync(
            copilot_id=copilot_id,
            client=self._client,
        )

    def update_ai_copilot(
        self,
        copilot_id: str,
        *,
        body: UpdateAiCopilot | Unset = UNSET,
    ) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
        from .api.ai import update_ai_copilot

        return update_ai_copilot._sync(
            copilot_id=copilot_id,
            body=body,
            client=self._client,
        )

    def delete_ai_copilot(
        self,
        copilot_id: str,
    ) -> Any:
        from .api.ai import delete_ai_copilot

        return delete_ai_copilot._sync(
            copilot_id=copilot_id,
            client=self._client,
        )

    def get_knowledge_sources(
        self,
        copilot_id: str,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetKnowledgeSources:
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
    ) -> FileKnowledgeSource | WebKnowledgeSource:
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
        body: CreateWebKnowledgeSource | Unset = UNSET,
    ) -> CreateWebKnowledgeSourceResponse200:
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
        body: File | Unset = UNSET,
    ) -> CreateFileKnowledgeSourceResponse200:
        from .api.ai import create_file_knowledge_source

        return create_file_knowledge_source._sync(
            copilot_id=copilot_id,
            name=name,
            body=body,
            client=self._client,
        )

    def get_file_knowledge_source_content(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> GetFileKnowledgeSourceContentResponse200:
        from .api.ai import get_file_knowledge_source_content

        return get_file_knowledge_source_content._sync(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    def delete_file_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> Any:
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
    ) -> Any:
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
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> None:
        from .api.ai import get_web_knowledge_source_links

        return get_web_knowledge_source_links._sync(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def get_management_projects(
        self,
        *,
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> ManagementProjectsResponse:
        from .api.management import get_management_projects

        return get_management_projects._sync(
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    def post_management_projects(
        self,
        *,
        body: CreateManagementProject | Unset = UNSET,
    ) -> ManagementProjectResponse:
        from .api.management import post_management_projects

        return post_management_projects._sync(
            body=body,
            client=self._client,
        )

    def get_management_project(
        self,
        project_id: str,
    ) -> ManagementProjectResponse:
        from .api.management import get_management_project

        return get_management_project._sync(
            project_id=project_id,
            client=self._client,
        )

    def post_management_project(
        self,
        project_id: str,
        *,
        body: UpdateManagementProject | Unset = UNSET,
    ) -> ManagementProjectResponse:
        from .api.management import post_management_project

        return post_management_project._sync(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    def delete_management_project(
        self,
        project_id: str,
    ) -> Any:
        from .api.management import delete_management_project

        return delete_management_project._sync(
            project_id=project_id,
            client=self._client,
        )

    def post_management_project_public_key_activate(
        self,
        project_id: str,
    ) -> Any:
        from .api.management import post_management_project_public_key_activate

        return post_management_project_public_key_activate._sync(
            project_id=project_id,
            client=self._client,
        )

    def post_management_project_public_key_deactivate(
        self,
        project_id: str,
    ) -> Any:
        from .api.management import post_management_project_public_key_deactivate

        return post_management_project_public_key_deactivate._sync(
            project_id=project_id,
            client=self._client,
        )

    def post_management_project_public_key_roll(
        self,
        project_id: str,
        *,
        body: ManagementProjectKeyRollRequest | Unset = UNSET,
    ) -> ManagementProjectPublicKeyResponse:
        from .api.management import post_management_project_public_key_roll

        return post_management_project_public_key_roll._sync(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    def post_management_project_secret_key_roll(
        self,
        project_id: str,
        *,
        body: ManagementProjectKeyRollRequest | Unset = UNSET,
    ) -> ManagementProjectSecretKeyResponse:
        from .api.management import post_management_project_secret_key_roll

        return post_management_project_secret_key_roll._sync(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    def get_management_webhooks(
        self,
        project_id: str,
        *,
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> ManagementWebhooksResponse:
        from .api.management import get_management_webhooks

        return get_management_webhooks._sync(
            project_id=project_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    def post_management_webhooks(
        self,
        project_id: str,
        *,
        body: CreateManagementWebhook | Unset = UNSET,
    ) -> ManagementWebhookResponse:
        from .api.management import post_management_webhooks

        return post_management_webhooks._sync(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    def get_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> ManagementWebhookResponse:
        from .api.management import get_management_webhook

        return get_management_webhook._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def post_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: UpdateManagementWebhook | Unset = UNSET,
    ) -> ManagementWebhookResponse:
        from .api.management import post_management_webhook

        return post_management_webhook._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def delete_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> Any:
        from .api.management import delete_management_webhook

        return delete_management_webhook._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def post_management_webhook_secret_roll(
        self,
        project_id: str,
        webhook_id: str,
    ) -> ManagementWebhookSecretRotateResponse:
        from .api.management import post_management_webhook_secret_roll

        return post_management_webhook_secret_roll._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def get_management_webhook_headers(
        self,
        project_id: str,
        webhook_id: str,
    ) -> ManagementWebhookHeadersResponse:
        from .api.management import get_management_webhook_headers

        return get_management_webhook_headers._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def post_management_webhook_headers(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookHeadersPatch | Unset = UNSET,
    ) -> ManagementWebhookHeadersResponse:
        from .api.management import post_management_webhook_headers

        return post_management_webhook_headers._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def post_management_webhook_headers_delete(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookHeadersDelete | Unset = UNSET,
    ) -> ManagementWebhookHeadersResponse:
        from .api.management import post_management_webhook_headers_delete

        return post_management_webhook_headers_delete._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def post_management_webhook_recover_failed_messages(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookRecoverRequest | Unset = UNSET,
    ) -> Any:
        from .api.management import post_management_webhook_recover_failed_messages

        return post_management_webhook_recover_failed_messages._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def post_management_webhook_test(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookTestRequest | Unset = UNSET,
    ) -> ManagementWebhookTestResponse:
        from .api.management import post_management_webhook_test

        return post_management_webhook_test._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
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

    def prepare_session(self, user_id: str) -> AsyncSession:
        from session import AsyncSession

        return AsyncSession(client=self, user_id=user_id)

    async def get_rooms(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        user_id: str | Unset = UNSET,
        group_ids: str | Unset = UNSET,
    ) -> GetRooms:
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

    async def post_rooms(
        self,
        *,
        body: CreateRoom | Unset = UNSET,
    ) -> Room:
        from .api.room import post_rooms

        return await post_rooms._asyncio(
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id(
        self,
        room_id: str,
    ) -> Room:
        from .api.room import get_rooms_room_id

        return await get_rooms_room_id._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def post_rooms_room_id(
        self,
        room_id: str,
        *,
        body: UpdateRoom | PostRoomsRoomIdFilesBody | Unset = UNSET,
    ) -> Room:
        from .api.room import post_rooms_room_id

        return await post_rooms_room_id._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def delete_rooms_room_id(
        self,
        room_id: str,
    ) -> Any:
        from .api.room import delete_rooms_room_id

        return await delete_rooms_room_id._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def get_rooms_room_id_prewarm(
        self,
        room_id: str,
    ) -> Any:
        from .api.room import get_rooms_room_id_prewarm

        return await get_rooms_room_id_prewarm._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def upsert_rooms_room_id(
        self,
        room_id: str,
        *,
        body: UpsertRoom | UpsertRoomsRoomIdFilesBody | Unset = UNSET,
    ) -> Room:
        from .api.room import upsert_rooms_room_id

        return await upsert_rooms_room_id._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def post_rooms_update_room_id(
        self,
        room_id: str,
        *,
        body: PostRoomsUpdateRoomIdFilesBody | Unset = UNSET,
    ) -> Room:
        from .api.room import post_rooms_update_room_id

        return await post_rooms_update_room_id._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_active_users(
        self,
        room_id: str,
    ) -> ActiveUsersResponse:
        from .api.room import get_rooms_room_id_active_users

        return await get_rooms_room_id_active_users._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def post_rooms_room_id_presence(
        self,
        room_id: str,
        *,
        body: SetPresence,
    ) -> Any:
        from .api.room import post_rooms_room_id_presence

        return await post_rooms_room_id_presence._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_storage(
        self,
        room_id: str,
        *,
        format_: GetRoomsRoomIdStorageFormat | Unset = UNSET,
    ) -> GetRoomsRoomIdStorageResponse200:
        from .api.storage import get_rooms_room_id_storage

        return await get_rooms_room_id_storage._asyncio(
            room_id=room_id,
            format_=format_,
            client=self._client,
        )

    async def post_rooms_room_id_storage(
        self,
        room_id: str,
        *,
        body: PostRoomsRoomIdStorageBody | Unset = UNSET,
    ) -> PostRoomsRoomIdStorageResponse200:
        from .api.storage import post_rooms_room_id_storage

        return await post_rooms_room_id_storage._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def delete_rooms_room_id_storage(
        self,
        room_id: str,
    ) -> Any:
        from .api.storage import delete_rooms_room_id_storage

        return await delete_rooms_room_id_storage._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def patch_rooms_room_id_storage_json_patch(
        self,
        room_id: str,
        *,
        body: list[PatchRoomsRoomIdStorageJsonPatchBodyItem],
    ) -> Any:
        from .api.storage import patch_rooms_room_id_storage_json_patch

        return await patch_rooms_room_id_storage_json_patch._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_ydoc(
        self,
        room_id: str,
        *,
        formatting: bool | Unset = UNSET,
        key: str | Unset = UNSET,
        type_: GetRoomsRoomIdYdocType | Unset = UNSET,
    ) -> GetRoomsRoomIdYdocResponse200:
        from .api.yjs import get_rooms_room_id_ydoc

        return await get_rooms_room_id_ydoc._asyncio(
            room_id=room_id,
            formatting=formatting,
            key=key,
            type_=type_,
            client=self._client,
        )

    async def put_rooms_room_id_ydoc(
        self,
        room_id: str,
        *,
        body: File | Unset = UNSET,
        guid: str | Unset = UNSET,
    ) -> Any:
        from .api.yjs import put_rooms_room_id_ydoc

        return await put_rooms_room_id_ydoc._asyncio(
            room_id=room_id,
            body=body,
            guid=guid,
            client=self._client,
        )

    async def get_rooms_room_id_ydoc_binary(
        self,
        room_id: str,
        *,
        guid: str | Unset = UNSET,
    ) -> File:
        from .api.yjs import get_rooms_room_id_ydoc_binary

        return await get_rooms_room_id_ydoc_binary._asyncio(
            room_id=room_id,
            guid=guid,
            client=self._client,
        )

    async def get_rooms_room_id_versions(
        self,
        room_id: str,
        *,
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> GetYjsVersions:
        from .api.yjs import get_rooms_room_id_versions

        return await get_rooms_room_id_versions._asyncio(
            room_id=room_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    async def get_rooms_room_id_version_version_id(
        self,
        room_id: str,
        version_id: str,
    ) -> File:
        from .api.yjs import get_rooms_room_id_version_version_id

        return await get_rooms_room_id_version_version_id._asyncio(
            room_id=room_id,
            version_id=version_id,
            client=self._client,
        )

    async def post_rooms_room_id_version(
        self,
        room_id: str,
    ) -> CreateYjsVersion:
        from .api.yjs import post_rooms_room_id_version

        return await post_rooms_room_id_version._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def get_rooms_room_id_threads(
        self,
        room_id: str,
        *,
        query: str | Unset = UNSET,
    ) -> None:
        from .api.comments import get_rooms_room_id_threads

        return await get_rooms_room_id_threads._asyncio(
            room_id=room_id,
            query=query,
            client=self._client,
        )

    async def post_rooms_room_id_threads(
        self,
        room_id: str,
        *,
        body: CreateThread | Unset = UNSET,
    ) -> None:
        from .api.comments import post_rooms_room_id_threads

        return await post_rooms_room_id_threads._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_threads_thread_id(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        from .api.comments import get_rooms_room_id_threads_thread_id

        return await get_rooms_room_id_threads_thread_id._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def delete_rooms_room_id_threads_thread_id(
        self,
        room_id: str,
        thread_id: str,
    ) -> Any:
        from .api.comments import delete_rooms_room_id_threads_thread_id

        return await delete_rooms_room_id_threads_thread_id._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_metadata(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: UpdateThreadMetadata | Unset = UNSET,
    ) -> ThreadMetadata:
        from .api.comments import post_rooms_room_id_threads_thread_id_metadata

        return await post_rooms_room_id_threads_thread_id_metadata._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_mark_as_resolved(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        from .api.comments import post_rooms_room_id_threads_thread_id_mark_as_resolved

        return await post_rooms_room_id_threads_thread_id_mark_as_resolved._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_mark_as_unresolved(
        self,
        room_id: str,
        thread_id: str,
    ) -> None:
        from .api.comments import post_rooms_room_id_threads_thread_id_mark_as_unresolved

        return await post_rooms_room_id_threads_thread_id_mark_as_unresolved._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_subscribe(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: PostRoomsRoomIdThreadsThreadIdSubscribeBody,
    ) -> Subscription:
        from .api.comments import post_rooms_room_id_threads_thread_id_subscribe

        return await post_rooms_room_id_threads_thread_id_subscribe._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_unsubscribe(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
    ) -> PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200:
        from .api.comments import post_rooms_room_id_threads_thread_id_unsubscribe

        return await post_rooms_room_id_threads_thread_id_unsubscribe._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_threads_thread_id_subscriptions(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200:
        from .api.comments import get_rooms_room_id_threads_thread_id_subscriptions

        return await get_rooms_room_id_threads_thread_id_subscriptions._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_comments(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: UpdateComment | Unset = UNSET,
    ) -> Comment:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments

        return await post_rooms_room_id_threads_thread_id_comments._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_threads_thread_id_comments_comment_id(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> Comment:
        from .api.comments import get_rooms_room_id_threads_thread_id_comments_comment_id

        return await get_rooms_room_id_threads_thread_id_comments_comment_id._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_comments_comment_id(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: UpdateComment | Unset = UNSET,
    ) -> UpdateComment:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id

        return await post_rooms_room_id_threads_thread_id_comments_comment_id._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def delete_rooms_room_id_threads_thread_id_comments_comment_id(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
    ) -> Any:
        from .api.comments import delete_rooms_room_id_threads_thread_id_comments_comment_id

        return await delete_rooms_room_id_threads_thread_id_comments_comment_id._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_comments_comment_id_add_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: AddCommentReaction | Unset = UNSET,
    ) -> CommentReaction:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id_add_reaction

        return await post_rooms_room_id_threads_thread_id_comments_comment_id_add_reaction._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_comments_comment_id_remove_reaction(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: RemoveCommentReaction | Unset = UNSET,
    ) -> Any:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id_remove_reaction

        return await post_rooms_room_id_threads_thread_id_comments_comment_id_remove_reaction._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def post_rooms_room_id_threads_thread_id_comments_comment_id_metadata(
        self,
        room_id: str,
        thread_id: str,
        comment_id: str,
        *,
        body: UpdateCommentMetadata | Unset = UNSET,
    ) -> CommentMetadata:
        from .api.comments import post_rooms_room_id_threads_thread_id_comments_comment_id_metadata

        return await post_rooms_room_id_threads_thread_id_comments_comment_id_metadata._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_threads_thread_id_participants(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetRoomsRoomIdThreadsThreadIdParticipantsResponse200:
        from .api.deprecated import get_rooms_room_id_threads_thread_id_participants

        return await get_rooms_room_id_threads_thread_id_participants._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def post_authorize(
        self,
        room_id: str,
        *,
        body: CreateAuthorization | Unset = UNSET,
    ) -> Authorization:
        from .api.deprecated import post_authorize

        return await post_authorize._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def post_public_authorize(
        self,
        room_id: str,
        *,
        body: PublicAuthorizeBodyRequest | Unset = UNSET,
    ) -> Authorization:
        from .api.deprecated import post_public_authorize

        return await post_public_authorize._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_rooms_room_id_users_user_id_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import get_rooms_room_id_users_user_id_notification_settings

        return await get_rooms_room_id_users_user_id_notification_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def post_rooms_room_id_users_user_id_notification_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: RoomSubscriptionSettings | Unset = UNSET,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import post_rooms_room_id_users_user_id_notification_settings

        return await post_rooms_room_id_users_user_id_notification_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    async def delete_rooms_room_id_users_user_id_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> Any:
        from .api.deprecated import delete_rooms_room_id_users_user_id_notification_settings

        return await delete_rooms_room_id_users_user_id_notification_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def post_authorize_user(
        self,
        *,
        body: AuthorizeUserRequest | Unset = UNSET,
    ) -> AnHTTPResponseBodyContainingAToken:
        from .api.authentication import post_authorize_user

        return await post_authorize_user._asyncio(
            body=body,
            client=self._client,
        )

    async def post_identify_user(
        self,
        *,
        body: IdentifyUserRequest | Unset = UNSET,
    ) -> AnHTTPResponseBodyContainingAToken:
        from .api.authentication import post_identify_user

        return await post_identify_user._asyncio(
            body=body,
            client=self._client,
        )

    async def get_users_user_id_inbox_notifications_inbox_notification_id(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> InboxNotificationCustomData | InboxNotificationThreadData:
        from .api.notifications import get_users_user_id_inbox_notifications_inbox_notification_id

        return await get_users_user_id_inbox_notifications_inbox_notification_id._asyncio(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    async def delete_users_user_id_inbox_notifications_inbox_notification_id(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> Any:
        from .api.notifications import delete_users_user_id_inbox_notifications_inbox_notification_id

        return await delete_users_user_id_inbox_notifications_inbox_notification_id._asyncio(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=self._client,
        )

    async def get_users_user_id_inbox_notifications(
        self,
        user_id: str,
        *,
        organization_id: str | Unset = UNSET,
        query: str | Unset = UNSET,
        limit: float | Unset = 50.0,
        starting_after: str | Unset = UNSET,
    ) -> list[InboxNotificationCustomData | InboxNotificationThreadData]:
        from .api.notifications import get_users_user_id_inbox_notifications

        return await get_users_user_id_inbox_notifications._asyncio(
            user_id=user_id,
            organization_id=organization_id,
            query=query,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def delete_users_user_id_inbox_notifications(
        self,
        user_id: str,
    ) -> Any:
        from .api.notifications import delete_users_user_id_inbox_notifications

        return await delete_users_user_id_inbox_notifications._asyncio(
            user_id=user_id,
            client=self._client,
        )

    async def get_users_user_id_notification_settings(
        self,
        user_id: str,
    ) -> NotificationSettings:
        from .api.notifications import get_users_user_id_notification_settings

        return await get_users_user_id_notification_settings._asyncio(
            user_id=user_id,
            client=self._client,
        )

    async def post_users_user_id_notification_settings(
        self,
        user_id: str,
        *,
        body: PartialNotificationSettings | Unset = UNSET,
    ) -> NotificationSettings:
        from .api.notifications import post_users_user_id_notification_settings

        return await post_users_user_id_notification_settings._asyncio(
            user_id=user_id,
            body=body,
            client=self._client,
        )

    async def delete_users_user_id_notification_settings(
        self,
        user_id: str,
    ) -> Any:
        from .api.notifications import delete_users_user_id_notification_settings

        return await delete_users_user_id_notification_settings._asyncio(
            user_id=user_id,
            client=self._client,
        )

    async def get_rooms_room_id_users_user_id_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        from .api.notifications import get_rooms_room_id_users_user_id_subscription_settings

        return await get_rooms_room_id_users_user_id_subscription_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def post_rooms_room_id_users_user_id_subscription_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: RoomSubscriptionSettings | Unset = UNSET,
    ) -> RoomSubscriptionSettings:
        from .api.notifications import post_rooms_room_id_users_user_id_subscription_settings

        return await post_rooms_room_id_users_user_id_subscription_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    async def delete_rooms_room_id_users_user_id_subscription_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> Any:
        from .api.notifications import delete_rooms_room_id_users_user_id_subscription_settings

        return await delete_rooms_room_id_users_user_id_subscription_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def get_users_user_id_subscription_settings(
        self,
        user_id: str,
        *,
        starting_after: str | Unset = UNSET,
        limit: float | Unset = 50.0,
    ) -> GetUsersUserIdSubscriptionSettingsResponse200:
        from .api.notifications import get_users_user_id_subscription_settings

        return await get_users_user_id_subscription_settings._asyncio(
            user_id=user_id,
            starting_after=starting_after,
            limit=limit,
            client=self._client,
        )

    async def post_inbox_notifications_trigger(
        self,
        *,
        body: TriggerInboxNotification | Unset = UNSET,
    ) -> Any:
        from .api.notifications import post_inbox_notifications_trigger

        return await post_inbox_notifications_trigger._asyncio(
            body=body,
            client=self._client,
        )

    async def get_groups(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetGroups:
        from .api.groups import get_groups

        return await get_groups._asyncio(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def post_groups(
        self,
        *,
        body: CreateGroup | Unset = UNSET,
    ) -> Group:
        from .api.groups import post_groups

        return await post_groups._asyncio(
            body=body,
            client=self._client,
        )

    async def get_groups_group_id(
        self,
        group_id: str,
    ) -> Group:
        from .api.groups import get_groups_group_id

        return await get_groups_group_id._asyncio(
            group_id=group_id,
            client=self._client,
        )

    async def delete_groups_group_id(
        self,
        group_id: str,
    ) -> Any:
        from .api.groups import delete_groups_group_id

        return await delete_groups_group_id._asyncio(
            group_id=group_id,
            client=self._client,
        )

    async def post_groups_group_id_add_members(
        self,
        group_id: str,
        *,
        body: AddGroupMembers | Unset = UNSET,
    ) -> Group:
        from .api.groups import post_groups_group_id_add_members

        return await post_groups_group_id_add_members._asyncio(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    async def post_groups_group_id_remove_members(
        self,
        group_id: str,
        *,
        body: RemoveGroupMembers | Unset = UNSET,
    ) -> Group:
        from .api.groups import post_groups_group_id_remove_members

        return await post_groups_group_id_remove_members._asyncio(
            group_id=group_id,
            body=body,
            client=self._client,
        )

    async def get_users_user_id_groups(
        self,
        user_id: str,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetUserGroups:
        from .api.groups import get_users_user_id_groups

        return await get_users_user_id_groups._asyncio(
            user_id=user_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def get_ai_copilots(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetAiCopilots:
        from .api.ai import get_ai_copilots

        return await get_ai_copilots._asyncio(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def create_ai_copilot(
        self,
        *,
        body: CreateAiCopilot | Unset = UNSET,
    ) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
        from .api.ai import create_ai_copilot

        return await create_ai_copilot._asyncio(
            body=body,
            client=self._client,
        )

    async def get_ai_copilot(
        self,
        copilot_id: str,
    ) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
        from .api.ai import get_ai_copilot

        return await get_ai_copilot._asyncio(
            copilot_id=copilot_id,
            client=self._client,
        )

    async def update_ai_copilot(
        self,
        copilot_id: str,
        *,
        body: UpdateAiCopilot | Unset = UNSET,
    ) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
        from .api.ai import update_ai_copilot

        return await update_ai_copilot._asyncio(
            copilot_id=copilot_id,
            body=body,
            client=self._client,
        )

    async def delete_ai_copilot(
        self,
        copilot_id: str,
    ) -> Any:
        from .api.ai import delete_ai_copilot

        return await delete_ai_copilot._asyncio(
            copilot_id=copilot_id,
            client=self._client,
        )

    async def get_knowledge_sources(
        self,
        copilot_id: str,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetKnowledgeSources:
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
    ) -> FileKnowledgeSource | WebKnowledgeSource:
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
        body: CreateWebKnowledgeSource | Unset = UNSET,
    ) -> CreateWebKnowledgeSourceResponse200:
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
        body: File | Unset = UNSET,
    ) -> CreateFileKnowledgeSourceResponse200:
        from .api.ai import create_file_knowledge_source

        return await create_file_knowledge_source._asyncio(
            copilot_id=copilot_id,
            name=name,
            body=body,
            client=self._client,
        )

    async def get_file_knowledge_source_content(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> GetFileKnowledgeSourceContentResponse200:
        from .api.ai import get_file_knowledge_source_content

        return await get_file_knowledge_source_content._asyncio(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            client=self._client,
        )

    async def delete_file_knowledge_source(
        self,
        copilot_id: str,
        knowledge_source_id: str,
    ) -> Any:
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
    ) -> Any:
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
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> None:
        from .api.ai import get_web_knowledge_source_links

        return await get_web_knowledge_source_links._asyncio(
            copilot_id=copilot_id,
            knowledge_source_id=knowledge_source_id,
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def get_management_projects(
        self,
        *,
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> ManagementProjectsResponse:
        from .api.management import get_management_projects

        return await get_management_projects._asyncio(
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    async def post_management_projects(
        self,
        *,
        body: CreateManagementProject | Unset = UNSET,
    ) -> ManagementProjectResponse:
        from .api.management import post_management_projects

        return await post_management_projects._asyncio(
            body=body,
            client=self._client,
        )

    async def get_management_project(
        self,
        project_id: str,
    ) -> ManagementProjectResponse:
        from .api.management import get_management_project

        return await get_management_project._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def post_management_project(
        self,
        project_id: str,
        *,
        body: UpdateManagementProject | Unset = UNSET,
    ) -> ManagementProjectResponse:
        from .api.management import post_management_project

        return await post_management_project._asyncio(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    async def delete_management_project(
        self,
        project_id: str,
    ) -> Any:
        from .api.management import delete_management_project

        return await delete_management_project._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def post_management_project_public_key_activate(
        self,
        project_id: str,
    ) -> Any:
        from .api.management import post_management_project_public_key_activate

        return await post_management_project_public_key_activate._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def post_management_project_public_key_deactivate(
        self,
        project_id: str,
    ) -> Any:
        from .api.management import post_management_project_public_key_deactivate

        return await post_management_project_public_key_deactivate._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def post_management_project_public_key_roll(
        self,
        project_id: str,
        *,
        body: ManagementProjectKeyRollRequest | Unset = UNSET,
    ) -> ManagementProjectPublicKeyResponse:
        from .api.management import post_management_project_public_key_roll

        return await post_management_project_public_key_roll._asyncio(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    async def post_management_project_secret_key_roll(
        self,
        project_id: str,
        *,
        body: ManagementProjectKeyRollRequest | Unset = UNSET,
    ) -> ManagementProjectSecretKeyResponse:
        from .api.management import post_management_project_secret_key_roll

        return await post_management_project_secret_key_roll._asyncio(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    async def get_management_webhooks(
        self,
        project_id: str,
        *,
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> ManagementWebhooksResponse:
        from .api.management import get_management_webhooks

        return await get_management_webhooks._asyncio(
            project_id=project_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    async def post_management_webhooks(
        self,
        project_id: str,
        *,
        body: CreateManagementWebhook | Unset = UNSET,
    ) -> ManagementWebhookResponse:
        from .api.management import post_management_webhooks

        return await post_management_webhooks._asyncio(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    async def get_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> ManagementWebhookResponse:
        from .api.management import get_management_webhook

        return await get_management_webhook._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def post_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: UpdateManagementWebhook | Unset = UNSET,
    ) -> ManagementWebhookResponse:
        from .api.management import post_management_webhook

        return await post_management_webhook._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def delete_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> Any:
        from .api.management import delete_management_webhook

        return await delete_management_webhook._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def post_management_webhook_secret_roll(
        self,
        project_id: str,
        webhook_id: str,
    ) -> ManagementWebhookSecretRotateResponse:
        from .api.management import post_management_webhook_secret_roll

        return await post_management_webhook_secret_roll._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def get_management_webhook_headers(
        self,
        project_id: str,
        webhook_id: str,
    ) -> ManagementWebhookHeadersResponse:
        from .api.management import get_management_webhook_headers

        return await get_management_webhook_headers._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def post_management_webhook_headers(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookHeadersPatch | Unset = UNSET,
    ) -> ManagementWebhookHeadersResponse:
        from .api.management import post_management_webhook_headers

        return await post_management_webhook_headers._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def post_management_webhook_headers_delete(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookHeadersDelete | Unset = UNSET,
    ) -> ManagementWebhookHeadersResponse:
        from .api.management import post_management_webhook_headers_delete

        return await post_management_webhook_headers_delete._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def post_management_webhook_recover_failed_messages(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookRecoverRequest | Unset = UNSET,
    ) -> Any:
        from .api.management import post_management_webhook_recover_failed_messages

        return await post_management_webhook_recover_failed_messages._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def post_management_webhook_test(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: ManagementWebhookTestRequest | Unset = UNSET,
    ) -> ManagementWebhookTestResponse:
        from .api.management import post_management_webhook_test

        return await post_management_webhook_test._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )
