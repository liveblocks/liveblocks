from __future__ import annotations

import re
from typing import TYPE_CHECKING, Any

import httpx

from .types import UNSET, File, Unset

if TYPE_CHECKING:
    from session import AsyncSession, Session

    from .models.active_users_response import ActiveUsersResponse
    from .models.add_comment_reaction_request_body import AddCommentReactionRequestBody
    from .models.add_group_members_request_body import AddGroupMembersRequestBody
    from .models.add_json_patch_operation import AddJsonPatchOperation
    from .models.ai_copilot_anthropic import AiCopilotAnthropic
    from .models.ai_copilot_google import AiCopilotGoogle
    from .models.ai_copilot_open_ai import AiCopilotOpenAi
    from .models.ai_copilot_open_ai_compatible import AiCopilotOpenAiCompatible
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
    from .models.create_file_knowledge_source_response_200 import CreateFileKnowledgeSourceResponse200
    from .models.create_group_request_body import CreateGroupRequestBody
    from .models.create_management_project_request_body import CreateManagementProjectRequestBody
    from .models.create_management_project_response import CreateManagementProjectResponse
    from .models.create_management_webhook_request_body import CreateManagementWebhookRequestBody
    from .models.create_management_webhook_response import CreateManagementWebhookResponse
    from .models.create_room_request_body import CreateRoomRequestBody
    from .models.create_thread_request_body import CreateThreadRequestBody
    from .models.create_web_knowledge_source_request_body import CreateWebKnowledgeSourceRequestBody
    from .models.create_web_knowledge_source_response import CreateWebKnowledgeSourceResponse
    from .models.create_yjs_version_response import CreateYjsVersionResponse
    from .models.delete_management_webhook_headers_request_body import DeleteManagementWebhookHeadersRequestBody
    from .models.delete_management_webhook_headers_response import DeleteManagementWebhookHeadersResponse
    from .models.edit_comment_metadata_request_body import EditCommentMetadataRequestBody
    from .models.edit_comment_request_body import EditCommentRequestBody
    from .models.get_ai_copilots_response import GetAiCopilotsResponse
    from .models.get_file_knowledge_source_markdown_response import GetFileKnowledgeSourceMarkdownResponse
    from .models.get_groups_response import GetGroupsResponse
    from .models.get_knowledge_sources_response import GetKnowledgeSourcesResponse
    from .models.get_management_project_response import GetManagementProjectResponse
    from .models.get_management_projects_response import GetManagementProjectsResponse
    from .models.get_management_webhook_headers_response import GetManagementWebhookHeadersResponse
    from .models.get_management_webhook_response import GetManagementWebhookResponse
    from .models.get_management_webhooks_response import GetManagementWebhooksResponse
    from .models.get_rooms_response import GetRoomsResponse
    from .models.get_storage_document_format import GetStorageDocumentFormat
    from .models.get_storage_document_response import GetStorageDocumentResponse
    from .models.get_thread_participants_response import GetThreadParticipantsResponse
    from .models.get_thread_subscriptions_response import GetThreadSubscriptionsResponse
    from .models.get_threads_response import GetThreadsResponse
    from .models.get_user_groups_response import GetUserGroupsResponse
    from .models.get_user_room_subscription_settings_response_200 import GetUserRoomSubscriptionSettingsResponse200
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
    from .models.management_project_roll_project_secret_api_key_response_secret_key_response import (
        ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse,
    )
    from .models.move_json_patch_operation import MoveJsonPatchOperation
    from .models.notification_settings import NotificationSettings
    from .models.recover_management_webhook_failed_messages_request_body import (
        RecoverManagementWebhookFailedMessagesRequestBody,
    )
    from .models.remove_comment_reaction_request_body import RemoveCommentReactionRequestBody
    from .models.remove_group_members_request_body import RemoveGroupMembersRequestBody
    from .models.remove_json_patch_operation import RemoveJsonPatchOperation
    from .models.replace_json_patch_operation import ReplaceJsonPatchOperation
    from .models.roll_project_public_api_key_request_body import RollProjectPublicApiKeyRequestBody
    from .models.roll_project_public_api_key_response import RollProjectPublicApiKeyResponse
    from .models.roll_project_secret_api_key_request_body import RollProjectSecretApiKeyRequestBody
    from .models.room import Room
    from .models.room_subscription_settings import RoomSubscriptionSettings
    from .models.rotate_management_webhook_secret_response import RotateManagementWebhookSecretResponse
    from .models.set_presence_request_body import SetPresenceRequestBody
    from .models.subscribe_to_thread_request_body import SubscribeToThreadRequestBody
    from .models.subscription import Subscription
    from .models.test_json_patch_operation import TestJsonPatchOperation
    from .models.test_management_webhook_request_body import TestManagementWebhookRequestBody
    from .models.test_management_webhook_response import TestManagementWebhookResponse
    from .models.thread import Thread
    from .models.thread_metadata import ThreadMetadata
    from .models.trigger_inbox_notification_request_body import TriggerInboxNotificationRequestBody
    from .models.unsubscribe_from_thread_request_body import UnsubscribeFromThreadRequestBody
    from .models.update_ai_copilot_request_body import UpdateAiCopilotRequestBody
    from .models.update_management_project_request_body import UpdateManagementProjectRequestBody
    from .models.update_management_project_response import UpdateManagementProjectResponse
    from .models.update_management_webhook_request_body import UpdateManagementWebhookRequestBody
    from .models.update_management_webhook_response import UpdateManagementWebhookResponse
    from .models.update_notification_settings_request_body import UpdateNotificationSettingsRequestBody
    from .models.update_room_id_request_body import UpdateRoomIdRequestBody
    from .models.update_room_request_body import UpdateRoomRequestBody
    from .models.update_room_subscription_settings_request_body import UpdateRoomSubscriptionSettingsRequestBody
    from .models.update_thread_metadata_reqeuest_body import UpdateThreadMetadataReqeuestBody
    from .models.upsert_management_webhook_headers_request_body import UpsertManagementWebhookHeadersRequestBody
    from .models.upsert_management_webhook_headers_response import UpsertManagementWebhookHeadersResponse
    from .models.upsert_room_request_body import UpsertRoomRequestBody

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
    ) -> GetRoomsResponse:
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
    ) -> Room:
        from .api.room import create_room

        return create_room._sync(
            body=body,
            client=self._client,
        )

    def get_room(
        self,
        room_id: str,
    ) -> Room:
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
        from .api.room import delete_room

        return delete_room._sync(
            room_id=room_id,
            client=self._client,
        )

    def prewarm_room(
        self,
        room_id: str,
    ) -> None:
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
        body: UpdateRoomIdRequestBody | Unset = UNSET,
    ) -> Room:
        from .api.room import update_room_id

        return update_room_id._sync(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    def get_active_users(
        self,
        room_id: str,
    ) -> ActiveUsersResponse:
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
        body: InitializeStorageDocumentBody | Unset = UNSET,
    ) -> InitializeStorageDocumentResponse:
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
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> GetYjsVersionsResponse:
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
        body: UpdateThreadMetadataReqeuestBody,
    ) -> ThreadMetadata:
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
    ) -> Thread:
        from .api.comments import mark_thread_as_resolved

        return mark_thread_as_resolved._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def mark_thread_as_unresolved(
        self,
        room_id: str,
        thread_id: str,
    ) -> Thread:
        from .api.comments import mark_thread_as_unresolved

        return mark_thread_as_unresolved._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def subscribe_to_thread(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: SubscribeToThreadRequestBody,
    ) -> Subscription:
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
        body: RemoveCommentReactionRequestBody | Unset = UNSET,
    ) -> None:
        from .api.comments import remove_comment_reaction

        return remove_comment_reaction._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
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
        from .api.comments import edit_comment_metadata

        return edit_comment_metadata._sync(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    def get_thread_participants(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetThreadParticipantsResponse:
        from .api.deprecated import get_thread_participants

        return get_thread_participants._sync(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    def get_room_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import get_room_notification_settings

        return get_room_notification_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def update_room_notification_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: UpdateRoomSubscriptionSettingsRequestBody | Unset = UNSET,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import update_room_notification_settings

        return update_room_notification_settings._sync(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    def delete_room_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> None:
        from .api.deprecated import delete_room_notification_settings

        return delete_room_notification_settings._sync(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    def authorize_user(
        self,
        *,
        body: AuthorizeUserRequestBody,
    ) -> AuthorizeUserResponse:
        from .api.authentication import authorize_user

        return authorize_user._sync(
            body=body,
            client=self._client,
        )

    def identify_user(
        self,
        *,
        body: IdentifyUserRequestBody,
    ) -> IdentifyUserResponse:
        from .api.authentication import identify_user

        return identify_user._sync(
            body=body,
            client=self._client,
        )

    def get_inbox_notification(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> InboxNotificationCustomData | InboxNotificationThreadData:
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
        limit: float | Unset = 50.0,
        starting_after: str | Unset = UNSET,
    ) -> list[InboxNotificationCustomData | InboxNotificationThreadData]:
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
        from .api.notifications import delete_all_inbox_notifications

        return delete_all_inbox_notifications._sync(
            user_id=user_id,
            client=self._client,
        )

    def get_notification_settings(
        self,
        user_id: str,
    ) -> NotificationSettings:
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
        limit: float | Unset = 50.0,
    ) -> GetUserRoomSubscriptionSettingsResponse200:
        from .api.notifications import get_user_room_subscription_settings

        return get_user_room_subscription_settings._sync(
            user_id=user_id,
            starting_after=starting_after,
            limit=limit,
            client=self._client,
        )

    def trigger_inbox_notification(
        self,
        *,
        body: TriggerInboxNotificationRequestBody | Unset = UNSET,
    ) -> None:
        from .api.notifications import trigger_inbox_notification

        return trigger_inbox_notification._sync(
            body=body,
            client=self._client,
        )

    def get_groups(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetGroupsResponse:
        from .api.groups import get_groups

        return get_groups._sync(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    def create_group(
        self,
        *,
        body: CreateGroupRequestBody | Unset = UNSET,
    ) -> Group:
        from .api.groups import create_group

        return create_group._sync(
            body=body,
            client=self._client,
        )

    def get_group(
        self,
        group_id: str,
    ) -> Group:
        from .api.groups import get_group

        return get_group._sync(
            group_id=group_id,
            client=self._client,
        )

    def delete_group(
        self,
        group_id: str,
    ) -> None:
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
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetUserGroupsResponse:
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
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetAiCopilotsResponse:
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
        from .api.ai import create_ai_copilot

        return create_ai_copilot._sync(
            body=body,
            client=self._client,
        )

    def get_ai_copilot(
        self,
        copilot_id: str,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
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
    ) -> GetKnowledgeSourcesResponse:
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
    ) -> CreateFileKnowledgeSourceResponse200:
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
    ) -> GetWebKnowledgeSourceLinksResponse:
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
    ) -> GetManagementProjectsResponse:
        from .api.management import get_management_projects

        return get_management_projects._sync(
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    def create_management_project(
        self,
        *,
        body: CreateManagementProjectRequestBody,
    ) -> CreateManagementProjectResponse:
        from .api.management import create_management_project

        return create_management_project._sync(
            body=body,
            client=self._client,
        )

    def get_management_project(
        self,
        project_id: str,
    ) -> GetManagementProjectResponse:
        from .api.management import get_management_project

        return get_management_project._sync(
            project_id=project_id,
            client=self._client,
        )

    def update_management_project(
        self,
        project_id: str,
        *,
        body: UpdateManagementProjectRequestBody,
    ) -> UpdateManagementProjectResponse:
        from .api.management import update_management_project

        return update_management_project._sync(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    def delete_management_project(
        self,
        project_id: str,
    ) -> None:
        from .api.management import delete_management_project

        return delete_management_project._sync(
            project_id=project_id,
            client=self._client,
        )

    def activate_project_public_api_key(
        self,
        project_id: str,
    ) -> None:
        from .api.management import activate_project_public_api_key

        return activate_project_public_api_key._sync(
            project_id=project_id,
            client=self._client,
        )

    def deactivate_project_public_api_key(
        self,
        project_id: str,
    ) -> None:
        from .api.management import deactivate_project_public_api_key

        return deactivate_project_public_api_key._sync(
            project_id=project_id,
            client=self._client,
        )

    def roll_project_public_api_key(
        self,
        project_id: str,
        *,
        body: RollProjectPublicApiKeyRequestBody | Unset = UNSET,
    ) -> RollProjectPublicApiKeyResponse:
        from .api.management import roll_project_public_api_key

        return roll_project_public_api_key._sync(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    def roll_project_secret_api_key(
        self,
        project_id: str,
        *,
        body: RollProjectSecretApiKeyRequestBody | Unset = UNSET,
    ) -> ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse:
        from .api.management import roll_project_secret_api_key

        return roll_project_secret_api_key._sync(
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
    ) -> GetManagementWebhooksResponse:
        from .api.management import get_management_webhooks

        return get_management_webhooks._sync(
            project_id=project_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    def create_management_webhook(
        self,
        project_id: str,
        *,
        body: CreateManagementWebhookRequestBody,
    ) -> CreateManagementWebhookResponse:
        from .api.management import create_management_webhook

        return create_management_webhook._sync(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    def get_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> GetManagementWebhookResponse:
        from .api.management import get_management_webhook

        return get_management_webhook._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def update_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: UpdateManagementWebhookRequestBody,
    ) -> UpdateManagementWebhookResponse:
        from .api.management import update_management_webhook

        return update_management_webhook._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def delete_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> None:
        from .api.management import delete_management_webhook

        return delete_management_webhook._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def roll_management_webhook_secret(
        self,
        project_id: str,
        webhook_id: str,
    ) -> RotateManagementWebhookSecretResponse:
        from .api.management import roll_management_webhook_secret

        return roll_management_webhook_secret._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def get_management_webhook_additional_headers(
        self,
        project_id: str,
        webhook_id: str,
    ) -> GetManagementWebhookHeadersResponse:
        from .api.management import get_management_webhook_additional_headers

        return get_management_webhook_additional_headers._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    def upsert_management_webhook_additional_headers(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: UpsertManagementWebhookHeadersRequestBody,
    ) -> UpsertManagementWebhookHeadersResponse:
        from .api.management import upsert_management_webhook_additional_headers

        return upsert_management_webhook_additional_headers._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def delete_management_webhook_additional_headers(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: DeleteManagementWebhookHeadersRequestBody,
    ) -> DeleteManagementWebhookHeadersResponse:
        from .api.management import delete_management_webhook_additional_headers

        return delete_management_webhook_additional_headers._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def recover_failed_webhook_messages(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: RecoverManagementWebhookFailedMessagesRequestBody,
    ) -> None:
        from .api.management import recover_failed_webhook_messages

        return recover_failed_webhook_messages._sync(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    def send_test_webhook(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: TestManagementWebhookRequestBody,
    ) -> TestManagementWebhookResponse:
        from .api.management import send_test_webhook

        return send_test_webhook._sync(
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
    ) -> GetRoomsResponse:
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
    ) -> Room:
        from .api.room import create_room

        return await create_room._asyncio(
            body=body,
            client=self._client,
        )

    async def get_room(
        self,
        room_id: str,
    ) -> Room:
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
        from .api.room import delete_room

        return await delete_room._asyncio(
            room_id=room_id,
            client=self._client,
        )

    async def prewarm_room(
        self,
        room_id: str,
    ) -> None:
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
        body: UpdateRoomIdRequestBody | Unset = UNSET,
    ) -> Room:
        from .api.room import update_room_id

        return await update_room_id._asyncio(
            room_id=room_id,
            body=body,
            client=self._client,
        )

    async def get_active_users(
        self,
        room_id: str,
    ) -> ActiveUsersResponse:
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
        body: InitializeStorageDocumentBody | Unset = UNSET,
    ) -> InitializeStorageDocumentResponse:
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
        limit: float | Unset = 20.0,
        cursor: str | Unset = UNSET,
    ) -> GetYjsVersionsResponse:
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
        body: UpdateThreadMetadataReqeuestBody,
    ) -> ThreadMetadata:
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
    ) -> Thread:
        from .api.comments import mark_thread_as_resolved

        return await mark_thread_as_resolved._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def mark_thread_as_unresolved(
        self,
        room_id: str,
        thread_id: str,
    ) -> Thread:
        from .api.comments import mark_thread_as_unresolved

        return await mark_thread_as_unresolved._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def subscribe_to_thread(
        self,
        room_id: str,
        thread_id: str,
        *,
        body: SubscribeToThreadRequestBody,
    ) -> Subscription:
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
        body: RemoveCommentReactionRequestBody | Unset = UNSET,
    ) -> None:
        from .api.comments import remove_comment_reaction

        return await remove_comment_reaction._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
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
        from .api.comments import edit_comment_metadata

        return await edit_comment_metadata._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            body=body,
            client=self._client,
        )

    async def get_thread_participants(
        self,
        room_id: str,
        thread_id: str,
    ) -> GetThreadParticipantsResponse:
        from .api.deprecated import get_thread_participants

        return await get_thread_participants._asyncio(
            room_id=room_id,
            thread_id=thread_id,
            client=self._client,
        )

    async def get_room_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import get_room_notification_settings

        return await get_room_notification_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def update_room_notification_settings(
        self,
        room_id: str,
        user_id: str,
        *,
        body: UpdateRoomSubscriptionSettingsRequestBody | Unset = UNSET,
    ) -> RoomSubscriptionSettings:
        from .api.deprecated import update_room_notification_settings

        return await update_room_notification_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            body=body,
            client=self._client,
        )

    async def delete_room_notification_settings(
        self,
        room_id: str,
        user_id: str,
    ) -> None:
        from .api.deprecated import delete_room_notification_settings

        return await delete_room_notification_settings._asyncio(
            room_id=room_id,
            user_id=user_id,
            client=self._client,
        )

    async def authorize_user(
        self,
        *,
        body: AuthorizeUserRequestBody,
    ) -> AuthorizeUserResponse:
        from .api.authentication import authorize_user

        return await authorize_user._asyncio(
            body=body,
            client=self._client,
        )

    async def identify_user(
        self,
        *,
        body: IdentifyUserRequestBody,
    ) -> IdentifyUserResponse:
        from .api.authentication import identify_user

        return await identify_user._asyncio(
            body=body,
            client=self._client,
        )

    async def get_inbox_notification(
        self,
        user_id: str,
        inbox_notification_id: str,
    ) -> InboxNotificationCustomData | InboxNotificationThreadData:
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
        limit: float | Unset = 50.0,
        starting_after: str | Unset = UNSET,
    ) -> list[InboxNotificationCustomData | InboxNotificationThreadData]:
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
        from .api.notifications import delete_all_inbox_notifications

        return await delete_all_inbox_notifications._asyncio(
            user_id=user_id,
            client=self._client,
        )

    async def get_notification_settings(
        self,
        user_id: str,
    ) -> NotificationSettings:
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
        limit: float | Unset = 50.0,
    ) -> GetUserRoomSubscriptionSettingsResponse200:
        from .api.notifications import get_user_room_subscription_settings

        return await get_user_room_subscription_settings._asyncio(
            user_id=user_id,
            starting_after=starting_after,
            limit=limit,
            client=self._client,
        )

    async def trigger_inbox_notification(
        self,
        *,
        body: TriggerInboxNotificationRequestBody | Unset = UNSET,
    ) -> None:
        from .api.notifications import trigger_inbox_notification

        return await trigger_inbox_notification._asyncio(
            body=body,
            client=self._client,
        )

    async def get_groups(
        self,
        *,
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetGroupsResponse:
        from .api.groups import get_groups

        return await get_groups._asyncio(
            limit=limit,
            starting_after=starting_after,
            client=self._client,
        )

    async def create_group(
        self,
        *,
        body: CreateGroupRequestBody | Unset = UNSET,
    ) -> Group:
        from .api.groups import create_group

        return await create_group._asyncio(
            body=body,
            client=self._client,
        )

    async def get_group(
        self,
        group_id: str,
    ) -> Group:
        from .api.groups import get_group

        return await get_group._asyncio(
            group_id=group_id,
            client=self._client,
        )

    async def delete_group(
        self,
        group_id: str,
    ) -> None:
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
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetUserGroupsResponse:
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
        limit: float | Unset = 20.0,
        starting_after: str | Unset = UNSET,
    ) -> GetAiCopilotsResponse:
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
        from .api.ai import create_ai_copilot

        return await create_ai_copilot._asyncio(
            body=body,
            client=self._client,
        )

    async def get_ai_copilot(
        self,
        copilot_id: str,
    ) -> AiCopilotAnthropic | AiCopilotGoogle | AiCopilotOpenAi | AiCopilotOpenAiCompatible:
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
    ) -> GetKnowledgeSourcesResponse:
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
    ) -> CreateFileKnowledgeSourceResponse200:
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
    ) -> GetWebKnowledgeSourceLinksResponse:
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
    ) -> GetManagementProjectsResponse:
        from .api.management import get_management_projects

        return await get_management_projects._asyncio(
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    async def create_management_project(
        self,
        *,
        body: CreateManagementProjectRequestBody,
    ) -> CreateManagementProjectResponse:
        from .api.management import create_management_project

        return await create_management_project._asyncio(
            body=body,
            client=self._client,
        )

    async def get_management_project(
        self,
        project_id: str,
    ) -> GetManagementProjectResponse:
        from .api.management import get_management_project

        return await get_management_project._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def update_management_project(
        self,
        project_id: str,
        *,
        body: UpdateManagementProjectRequestBody,
    ) -> UpdateManagementProjectResponse:
        from .api.management import update_management_project

        return await update_management_project._asyncio(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    async def delete_management_project(
        self,
        project_id: str,
    ) -> None:
        from .api.management import delete_management_project

        return await delete_management_project._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def activate_project_public_api_key(
        self,
        project_id: str,
    ) -> None:
        from .api.management import activate_project_public_api_key

        return await activate_project_public_api_key._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def deactivate_project_public_api_key(
        self,
        project_id: str,
    ) -> None:
        from .api.management import deactivate_project_public_api_key

        return await deactivate_project_public_api_key._asyncio(
            project_id=project_id,
            client=self._client,
        )

    async def roll_project_public_api_key(
        self,
        project_id: str,
        *,
        body: RollProjectPublicApiKeyRequestBody | Unset = UNSET,
    ) -> RollProjectPublicApiKeyResponse:
        from .api.management import roll_project_public_api_key

        return await roll_project_public_api_key._asyncio(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    async def roll_project_secret_api_key(
        self,
        project_id: str,
        *,
        body: RollProjectSecretApiKeyRequestBody | Unset = UNSET,
    ) -> ManagementProjectRollProjectSecretApiKeyResponseSecretKeyResponse:
        from .api.management import roll_project_secret_api_key

        return await roll_project_secret_api_key._asyncio(
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
    ) -> GetManagementWebhooksResponse:
        from .api.management import get_management_webhooks

        return await get_management_webhooks._asyncio(
            project_id=project_id,
            limit=limit,
            cursor=cursor,
            client=self._client,
        )

    async def create_management_webhook(
        self,
        project_id: str,
        *,
        body: CreateManagementWebhookRequestBody,
    ) -> CreateManagementWebhookResponse:
        from .api.management import create_management_webhook

        return await create_management_webhook._asyncio(
            project_id=project_id,
            body=body,
            client=self._client,
        )

    async def get_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> GetManagementWebhookResponse:
        from .api.management import get_management_webhook

        return await get_management_webhook._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def update_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: UpdateManagementWebhookRequestBody,
    ) -> UpdateManagementWebhookResponse:
        from .api.management import update_management_webhook

        return await update_management_webhook._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def delete_management_webhook(
        self,
        project_id: str,
        webhook_id: str,
    ) -> None:
        from .api.management import delete_management_webhook

        return await delete_management_webhook._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def roll_management_webhook_secret(
        self,
        project_id: str,
        webhook_id: str,
    ) -> RotateManagementWebhookSecretResponse:
        from .api.management import roll_management_webhook_secret

        return await roll_management_webhook_secret._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def get_management_webhook_additional_headers(
        self,
        project_id: str,
        webhook_id: str,
    ) -> GetManagementWebhookHeadersResponse:
        from .api.management import get_management_webhook_additional_headers

        return await get_management_webhook_additional_headers._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            client=self._client,
        )

    async def upsert_management_webhook_additional_headers(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: UpsertManagementWebhookHeadersRequestBody,
    ) -> UpsertManagementWebhookHeadersResponse:
        from .api.management import upsert_management_webhook_additional_headers

        return await upsert_management_webhook_additional_headers._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def delete_management_webhook_additional_headers(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: DeleteManagementWebhookHeadersRequestBody,
    ) -> DeleteManagementWebhookHeadersResponse:
        from .api.management import delete_management_webhook_additional_headers

        return await delete_management_webhook_additional_headers._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def recover_failed_webhook_messages(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: RecoverManagementWebhookFailedMessagesRequestBody,
    ) -> None:
        from .api.management import recover_failed_webhook_messages

        return await recover_failed_webhook_messages._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )

    async def send_test_webhook(
        self,
        project_id: str,
        webhook_id: str,
        *,
        body: TestManagementWebhookRequestBody,
    ) -> TestManagementWebhookResponse:
        from .api.management import send_test_webhook

        return await send_test_webhook._asyncio(
            project_id=project_id,
            webhook_id=webhook_id,
            body=body,
            client=self._client,
        )
