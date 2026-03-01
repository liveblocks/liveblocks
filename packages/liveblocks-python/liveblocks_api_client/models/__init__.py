"""Contains all the data models used in inputs/outputs"""

from .active_users_response import ActiveUsersResponse
from .active_users_response_data_item import ActiveUsersResponseDataItem
from .add_comment_reaction import AddCommentReaction
from .add_group_members import AddGroupMembers
from .ai_copilot_type_0_provider_model import AiCopilotType0ProviderModel
from .ai_copilot_type_0_provider_options_openai_reasoning_effort import (
    AiCopilotType0ProviderOptionsOpenaiReasoningEffort,
)
from .ai_copilot_type_0_provider_options_openai_web_search import AiCopilotType0ProviderOptionsOpenaiWebSearch
from .ai_copilot_type_1_provider_model import AiCopilotType1ProviderModel
from .ai_copilot_type_1_provider_options_anthropic_thinking_type_0 import (
    AiCopilotType1ProviderOptionsAnthropicThinkingType0,
)
from .ai_copilot_type_1_provider_options_anthropic_thinking_type_1 import (
    AiCopilotType1ProviderOptionsAnthropicThinkingType1,
)
from .ai_copilot_type_1_provider_options_anthropic_web_search import AiCopilotType1ProviderOptionsAnthropicWebSearch
from .ai_copilot_type_2_provider_model import AiCopilotType2ProviderModel
from .ai_copilot_type_2_provider_options_google_thinking_config import AiCopilotType2ProviderOptionsGoogleThinkingConfig
from .ai_copilot_type_3 import AiCopilotType3
from .an_http_response_body_containing_a_token import AnHTTPResponseBodyContainingAToken
from .authorization import Authorization
from .authorize_user_request import AuthorizeUserRequest
from .authorize_user_request_permissions import AuthorizeUserRequestPermissions
from .authorize_user_request_user_info import AuthorizeUserRequestUserInfo
from .comment import Comment
from .comment_body import CommentBody
from .comment_body_content_item import CommentBodyContentItem
from .comment_metadata import CommentMetadata
from .comment_reaction import CommentReaction
from .copilot_settings import CopilotSettings
from .create_ai_copilot import CreateAiCopilot
from .create_ai_copilot_provider import CreateAiCopilotProvider
from .create_ai_copilot_provider_options_type_0 import CreateAiCopilotProviderOptionsType0
from .create_ai_copilot_provider_options_type_0_openai import CreateAiCopilotProviderOptionsType0Openai
from .create_ai_copilot_provider_options_type_0_openai_reasoning_effort import (
    CreateAiCopilotProviderOptionsType0OpenaiReasoningEffort,
)
from .create_ai_copilot_provider_options_type_0_openai_web_search import (
    CreateAiCopilotProviderOptionsType0OpenaiWebSearch,
)
from .create_ai_copilot_provider_options_type_1 import CreateAiCopilotProviderOptionsType1
from .create_ai_copilot_provider_options_type_1_anthropic import CreateAiCopilotProviderOptionsType1Anthropic
from .create_ai_copilot_provider_options_type_1_anthropic_thinking_type_0 import (
    CreateAiCopilotProviderOptionsType1AnthropicThinkingType0,
)
from .create_ai_copilot_provider_options_type_1_anthropic_thinking_type_1 import (
    CreateAiCopilotProviderOptionsType1AnthropicThinkingType1,
)
from .create_ai_copilot_provider_options_type_1_anthropic_web_search import (
    CreateAiCopilotProviderOptionsType1AnthropicWebSearch,
)
from .create_ai_copilot_provider_options_type_2 import CreateAiCopilotProviderOptionsType2
from .create_ai_copilot_provider_options_type_2_google import CreateAiCopilotProviderOptionsType2Google
from .create_ai_copilot_provider_options_type_2_google_thinking_config import (
    CreateAiCopilotProviderOptionsType2GoogleThinkingConfig,
)
from .create_authorization import CreateAuthorization
from .create_authorization_user_info import CreateAuthorizationUserInfo
from .create_comment import CreateComment
from .create_file_knowledge_source_response_200 import CreateFileKnowledgeSourceResponse200
from .create_group import CreateGroup
from .create_group_scopes import CreateGroupScopes
from .create_management_project import CreateManagementProject
from .create_management_webhook import CreateManagementWebhook
from .create_management_webhook_additional_headers import CreateManagementWebhookAdditionalHeaders
from .create_room import CreateRoom
from .create_room_engine import CreateRoomEngine
from .create_room_groups_accesses import CreateRoomGroupsAccesses
from .create_room_metadata import CreateRoomMetadata
from .create_room_users_accesses import CreateRoomUsersAccesses
from .create_thread import CreateThread
from .create_thread_comment import CreateThreadComment
from .create_thread_comment_body import CreateThreadCommentBody
from .create_thread_comment_body_content_item import CreateThreadCommentBodyContentItem
from .create_thread_metadata import CreateThreadMetadata
from .create_web_knowledge_source import CreateWebKnowledgeSource
from .create_web_knowledge_source_response_200 import CreateWebKnowledgeSourceResponse200
from .create_web_knowledge_source_type import CreateWebKnowledgeSourceType
from .create_yjs_version import CreateYjsVersion
from .create_yjs_version_data import CreateYjsVersionData
from .error import Error
from .file_knowledge_source_file import FileKnowledgeSourceFile
from .file_knowledge_source_status import FileKnowledgeSourceStatus
from .get_ai_copilots import GetAiCopilots
from .get_file_knowledge_source_content_response_200 import GetFileKnowledgeSourceContentResponse200
from .get_groups import GetGroups
from .get_knowledge_sources import GetKnowledgeSources
from .get_rooms import GetRooms
from .get_rooms_data_item import GetRoomsDataItem
from .get_rooms_data_item_groups_accesses import GetRoomsDataItemGroupsAccesses
from .get_rooms_data_item_metadata import GetRoomsDataItemMetadata
from .get_rooms_data_item_users_accesses import GetRoomsDataItemUsersAccesses
from .get_rooms_room_id_storage_format import GetRoomsRoomIdStorageFormat
from .get_rooms_room_id_storage_response_200 import GetRoomsRoomIdStorageResponse200
from .get_rooms_room_id_storage_response_200_data_type_1 import GetRoomsRoomIdStorageResponse200DataType1
from .get_rooms_room_id_threads_thread_id_participants_response_200 import (
    GetRoomsRoomIdThreadsThreadIdParticipantsResponse200,
)
from .get_rooms_room_id_threads_thread_id_subscriptions_response_200 import (
    GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200,
)
from .get_rooms_room_id_ydoc_response_200 import GetRoomsRoomIdYdocResponse200
from .get_rooms_room_id_ydoc_type import GetRoomsRoomIdYdocType
from .get_user_groups import GetUserGroups
from .get_users_user_id_subscription_settings_response_200 import GetUsersUserIdSubscriptionSettingsResponse200
from .get_users_user_id_subscription_settings_response_200_meta import GetUsersUserIdSubscriptionSettingsResponse200Meta
from .get_yjs_versions import GetYjsVersions
from .get_yjs_versions_data_item import GetYjsVersionsDataItem
from .get_yjs_versions_data_item_authors_item import GetYjsVersionsDataItemAuthorsItem
from .get_yjs_versions_data_item_kind import GetYjsVersionsDataItemKind
from .get_yjs_versions_data_item_type import GetYjsVersionsDataItemType
from .group import Group
from .group_member import GroupMember
from .group_scopes import GroupScopes
from .group_type import GroupType
from .identify_user_request import IdentifyUserRequest
from .identify_user_request_user_info import IdentifyUserRequestUserInfo
from .inbox_notification_custom_data import InboxNotificationCustomData
from .inbox_notification_custom_data_activity_data import InboxNotificationCustomDataActivityData
from .inbox_notification_thread_data import InboxNotificationThreadData
from .management_project import ManagementProject
from .management_project_key_roll_request import ManagementProjectKeyRollRequest
from .management_project_key_roll_request_expiration_in import ManagementProjectKeyRollRequestExpirationIn
from .management_project_public_key import ManagementProjectPublicKey
from .management_project_public_key_response import ManagementProjectPublicKeyResponse
from .management_project_region import ManagementProjectRegion
from .management_project_response import ManagementProjectResponse
from .management_project_secret_key import ManagementProjectSecretKey
from .management_project_secret_key_response import ManagementProjectSecretKeyResponse
from .management_project_type import ManagementProjectType
from .management_projects_response import ManagementProjectsResponse
from .management_webhook import ManagementWebhook
from .management_webhook_additional_headers import ManagementWebhookAdditionalHeaders
from .management_webhook_event import ManagementWebhookEvent
from .management_webhook_headers_delete import ManagementWebhookHeadersDelete
from .management_webhook_headers_patch import ManagementWebhookHeadersPatch
from .management_webhook_headers_patch_headers import ManagementWebhookHeadersPatchHeaders
from .management_webhook_headers_response import ManagementWebhookHeadersResponse
from .management_webhook_headers_response_headers import ManagementWebhookHeadersResponseHeaders
from .management_webhook_recover_request import ManagementWebhookRecoverRequest
from .management_webhook_response import ManagementWebhookResponse
from .management_webhook_secret import ManagementWebhookSecret
from .management_webhook_secret_rotate_response import ManagementWebhookSecretRotateResponse
from .management_webhook_test_request import ManagementWebhookTestRequest
from .management_webhook_test_response import ManagementWebhookTestResponse
from .management_webhook_test_response_message import ManagementWebhookTestResponseMessage
from .management_webhooks_response import ManagementWebhooksResponse
from .notification_channel_settings import NotificationChannelSettings
from .notification_settings import NotificationSettings
from .partial_notification_settings import PartialNotificationSettings
from .patch_rooms_room_id_storage_json_patch_body_item import PatchRoomsRoomIdStorageJsonPatchBodyItem
from .patch_rooms_room_id_storage_json_patch_body_item_op import PatchRoomsRoomIdStorageJsonPatchBodyItemOp
from .post_rooms_room_id_files_body import PostRoomsRoomIdFilesBody
from .post_rooms_room_id_storage_body import PostRoomsRoomIdStorageBody
from .post_rooms_room_id_storage_body_data import PostRoomsRoomIdStorageBodyData
from .post_rooms_room_id_storage_response_200 import PostRoomsRoomIdStorageResponse200
from .post_rooms_room_id_storage_response_200_data_type_1 import PostRoomsRoomIdStorageResponse200DataType1
from .post_rooms_room_id_threads_thread_id_subscribe_body import PostRoomsRoomIdThreadsThreadIdSubscribeBody
from .post_rooms_room_id_threads_thread_id_unsubscribe_body import PostRoomsRoomIdThreadsThreadIdUnsubscribeBody
from .post_rooms_room_id_threads_thread_id_unsubscribe_response_200 import (
    PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200,
)
from .post_rooms_update_room_id_files_body import PostRoomsUpdateRoomIdFilesBody
from .public_authorize_body_request import PublicAuthorizeBodyRequest
from .remove_comment_reaction import RemoveCommentReaction
from .remove_group_members import RemoveGroupMembers
from .room import Room
from .room_groups_accesses import RoomGroupsAccesses
from .room_metadata import RoomMetadata
from .room_subscription_settings import RoomSubscriptionSettings
from .room_subscription_settings_text_mentions import RoomSubscriptionSettingsTextMentions
from .room_subscription_settings_threads import RoomSubscriptionSettingsThreads
from .room_type import RoomType
from .room_users_accesses import RoomUsersAccesses
from .schema import Schema
from .schema_request import SchemaRequest
from .set_presence import SetPresence
from .set_presence_data import SetPresenceData
from .set_presence_user_info import SetPresenceUserInfo
from .subscription import Subscription
from .trigger_inbox_notification import TriggerInboxNotification
from .trigger_inbox_notification_activity_data import TriggerInboxNotificationActivityData
from .update_ai_copilot import UpdateAiCopilot
from .update_ai_copilot_provider import UpdateAiCopilotProvider
from .update_ai_copilot_provider_options_type_0 import UpdateAiCopilotProviderOptionsType0
from .update_ai_copilot_provider_options_type_0_openai import UpdateAiCopilotProviderOptionsType0Openai
from .update_ai_copilot_provider_options_type_0_openai_reasoning_effort import (
    UpdateAiCopilotProviderOptionsType0OpenaiReasoningEffort,
)
from .update_ai_copilot_provider_options_type_0_openai_web_search import (
    UpdateAiCopilotProviderOptionsType0OpenaiWebSearch,
)
from .update_ai_copilot_provider_options_type_1 import UpdateAiCopilotProviderOptionsType1
from .update_ai_copilot_provider_options_type_1_anthropic import UpdateAiCopilotProviderOptionsType1Anthropic
from .update_ai_copilot_provider_options_type_1_anthropic_thinking_type_0 import (
    UpdateAiCopilotProviderOptionsType1AnthropicThinkingType0,
)
from .update_ai_copilot_provider_options_type_1_anthropic_thinking_type_1 import (
    UpdateAiCopilotProviderOptionsType1AnthropicThinkingType1,
)
from .update_ai_copilot_provider_options_type_1_anthropic_web_search import (
    UpdateAiCopilotProviderOptionsType1AnthropicWebSearch,
)
from .update_ai_copilot_provider_options_type_2 import UpdateAiCopilotProviderOptionsType2
from .update_ai_copilot_provider_options_type_2_google import UpdateAiCopilotProviderOptionsType2Google
from .update_ai_copilot_provider_options_type_2_google_thinking_config import (
    UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig,
)
from .update_comment import UpdateComment
from .update_comment_metadata import UpdateCommentMetadata
from .update_comment_metadata_metadata import UpdateCommentMetadataMetadata
from .update_management_project import UpdateManagementProject
from .update_management_webhook import UpdateManagementWebhook
from .update_room import UpdateRoom
from .update_room_groups_accesses_type_0 import UpdateRoomGroupsAccessesType0
from .update_room_metadata_type_0 import UpdateRoomMetadataType0
from .update_room_users_accesses_type_0 import UpdateRoomUsersAccessesType0
from .update_schema import UpdateSchema
from .update_thread_metadata import UpdateThreadMetadata
from .update_thread_metadata_metadata import UpdateThreadMetadataMetadata
from .upsert_room import UpsertRoom
from .upsert_room_create import UpsertRoomCreate
from .upsert_room_create_groups_accesses_type_0 import UpsertRoomCreateGroupsAccessesType0
from .upsert_room_create_metadata_type_0 import UpsertRoomCreateMetadataType0
from .upsert_room_create_users_accesses_type_0 import UpsertRoomCreateUsersAccessesType0
from .upsert_room_update import UpsertRoomUpdate
from .upsert_room_update_groups_accesses_type_0 import UpsertRoomUpdateGroupsAccessesType0
from .upsert_room_update_metadata_type_0 import UpsertRoomUpdateMetadataType0
from .upsert_room_update_users_accesses_type_0 import UpsertRoomUpdateUsersAccessesType0
from .upsert_rooms_room_id_files_body import UpsertRoomsRoomIdFilesBody
from .user_room_subscription_settings import UserRoomSubscriptionSettings
from .user_room_subscription_settings_text_mentions import UserRoomSubscriptionSettingsTextMentions
from .user_room_subscription_settings_threads import UserRoomSubscriptionSettingsThreads
from .user_subscription import UserSubscription
from .web_knowledge_source_link import WebKnowledgeSourceLink
from .web_knowledge_source_link_type import WebKnowledgeSourceLinkType
from .web_knowledge_source_status import WebKnowledgeSourceStatus

__all__ = (
    "ActiveUsersResponse",
    "ActiveUsersResponseDataItem",
    "AddCommentReaction",
    "AddGroupMembers",
    "AiCopilotType0ProviderModel",
    "AiCopilotType0ProviderOptionsOpenaiReasoningEffort",
    "AiCopilotType0ProviderOptionsOpenaiWebSearch",
    "AiCopilotType1ProviderModel",
    "AiCopilotType1ProviderOptionsAnthropicThinkingType0",
    "AiCopilotType1ProviderOptionsAnthropicThinkingType1",
    "AiCopilotType1ProviderOptionsAnthropicWebSearch",
    "AiCopilotType2ProviderModel",
    "AiCopilotType2ProviderOptionsGoogleThinkingConfig",
    "AiCopilotType3",
    "AnHTTPResponseBodyContainingAToken",
    "Authorization",
    "AuthorizeUserRequest",
    "AuthorizeUserRequestPermissions",
    "AuthorizeUserRequestUserInfo",
    "Comment",
    "CommentBody",
    "CommentBodyContentItem",
    "CommentMetadata",
    "CommentReaction",
    "CopilotSettings",
    "CreateAiCopilot",
    "CreateAiCopilotProvider",
    "CreateAiCopilotProviderOptionsType0",
    "CreateAiCopilotProviderOptionsType0Openai",
    "CreateAiCopilotProviderOptionsType0OpenaiReasoningEffort",
    "CreateAiCopilotProviderOptionsType0OpenaiWebSearch",
    "CreateAiCopilotProviderOptionsType1",
    "CreateAiCopilotProviderOptionsType1Anthropic",
    "CreateAiCopilotProviderOptionsType1AnthropicThinkingType0",
    "CreateAiCopilotProviderOptionsType1AnthropicThinkingType1",
    "CreateAiCopilotProviderOptionsType1AnthropicWebSearch",
    "CreateAiCopilotProviderOptionsType2",
    "CreateAiCopilotProviderOptionsType2Google",
    "CreateAiCopilotProviderOptionsType2GoogleThinkingConfig",
    "CreateAuthorization",
    "CreateAuthorizationUserInfo",
    "CreateComment",
    "CreateFileKnowledgeSourceResponse200",
    "CreateGroup",
    "CreateGroupScopes",
    "CreateManagementProject",
    "CreateManagementWebhook",
    "CreateManagementWebhookAdditionalHeaders",
    "CreateRoom",
    "CreateRoomEngine",
    "CreateRoomGroupsAccesses",
    "CreateRoomMetadata",
    "CreateRoomUsersAccesses",
    "CreateThread",
    "CreateThreadComment",
    "CreateThreadCommentBody",
    "CreateThreadCommentBodyContentItem",
    "CreateThreadMetadata",
    "CreateWebKnowledgeSource",
    "CreateWebKnowledgeSourceResponse200",
    "CreateWebKnowledgeSourceType",
    "CreateYjsVersion",
    "CreateYjsVersionData",
    "Error",
    "FileKnowledgeSourceFile",
    "FileKnowledgeSourceStatus",
    "GetAiCopilots",
    "GetFileKnowledgeSourceContentResponse200",
    "GetGroups",
    "GetKnowledgeSources",
    "GetRooms",
    "GetRoomsDataItem",
    "GetRoomsDataItemGroupsAccesses",
    "GetRoomsDataItemMetadata",
    "GetRoomsDataItemUsersAccesses",
    "GetRoomsRoomIdStorageFormat",
    "GetRoomsRoomIdStorageResponse200",
    "GetRoomsRoomIdStorageResponse200DataType1",
    "GetRoomsRoomIdThreadsThreadIdParticipantsResponse200",
    "GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200",
    "GetRoomsRoomIdYdocResponse200",
    "GetRoomsRoomIdYdocType",
    "GetUserGroups",
    "GetUsersUserIdSubscriptionSettingsResponse200",
    "GetUsersUserIdSubscriptionSettingsResponse200Meta",
    "GetYjsVersions",
    "GetYjsVersionsDataItem",
    "GetYjsVersionsDataItemAuthorsItem",
    "GetYjsVersionsDataItemKind",
    "GetYjsVersionsDataItemType",
    "Group",
    "GroupMember",
    "GroupScopes",
    "GroupType",
    "IdentifyUserRequest",
    "IdentifyUserRequestUserInfo",
    "InboxNotificationCustomData",
    "InboxNotificationCustomDataActivityData",
    "InboxNotificationThreadData",
    "ManagementProject",
    "ManagementProjectKeyRollRequest",
    "ManagementProjectKeyRollRequestExpirationIn",
    "ManagementProjectPublicKey",
    "ManagementProjectPublicKeyResponse",
    "ManagementProjectRegion",
    "ManagementProjectResponse",
    "ManagementProjectSecretKey",
    "ManagementProjectSecretKeyResponse",
    "ManagementProjectsResponse",
    "ManagementProjectType",
    "ManagementWebhook",
    "ManagementWebhookAdditionalHeaders",
    "ManagementWebhookEvent",
    "ManagementWebhookHeadersDelete",
    "ManagementWebhookHeadersPatch",
    "ManagementWebhookHeadersPatchHeaders",
    "ManagementWebhookHeadersResponse",
    "ManagementWebhookHeadersResponseHeaders",
    "ManagementWebhookRecoverRequest",
    "ManagementWebhookResponse",
    "ManagementWebhookSecret",
    "ManagementWebhookSecretRotateResponse",
    "ManagementWebhooksResponse",
    "ManagementWebhookTestRequest",
    "ManagementWebhookTestResponse",
    "ManagementWebhookTestResponseMessage",
    "NotificationChannelSettings",
    "NotificationSettings",
    "PartialNotificationSettings",
    "PatchRoomsRoomIdStorageJsonPatchBodyItem",
    "PatchRoomsRoomIdStorageJsonPatchBodyItemOp",
    "PostRoomsRoomIdFilesBody",
    "PostRoomsRoomIdStorageBody",
    "PostRoomsRoomIdStorageBodyData",
    "PostRoomsRoomIdStorageResponse200",
    "PostRoomsRoomIdStorageResponse200DataType1",
    "PostRoomsRoomIdThreadsThreadIdSubscribeBody",
    "PostRoomsRoomIdThreadsThreadIdUnsubscribeBody",
    "PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200",
    "PostRoomsUpdateRoomIdFilesBody",
    "PublicAuthorizeBodyRequest",
    "RemoveCommentReaction",
    "RemoveGroupMembers",
    "Room",
    "RoomGroupsAccesses",
    "RoomMetadata",
    "RoomSubscriptionSettings",
    "RoomSubscriptionSettingsTextMentions",
    "RoomSubscriptionSettingsThreads",
    "RoomType",
    "RoomUsersAccesses",
    "Schema",
    "SchemaRequest",
    "SetPresence",
    "SetPresenceData",
    "SetPresenceUserInfo",
    "Subscription",
    "TriggerInboxNotification",
    "TriggerInboxNotificationActivityData",
    "UpdateAiCopilot",
    "UpdateAiCopilotProvider",
    "UpdateAiCopilotProviderOptionsType0",
    "UpdateAiCopilotProviderOptionsType0Openai",
    "UpdateAiCopilotProviderOptionsType0OpenaiReasoningEffort",
    "UpdateAiCopilotProviderOptionsType0OpenaiWebSearch",
    "UpdateAiCopilotProviderOptionsType1",
    "UpdateAiCopilotProviderOptionsType1Anthropic",
    "UpdateAiCopilotProviderOptionsType1AnthropicThinkingType0",
    "UpdateAiCopilotProviderOptionsType1AnthropicThinkingType1",
    "UpdateAiCopilotProviderOptionsType1AnthropicWebSearch",
    "UpdateAiCopilotProviderOptionsType2",
    "UpdateAiCopilotProviderOptionsType2Google",
    "UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig",
    "UpdateComment",
    "UpdateCommentMetadata",
    "UpdateCommentMetadataMetadata",
    "UpdateManagementProject",
    "UpdateManagementWebhook",
    "UpdateRoom",
    "UpdateRoomGroupsAccessesType0",
    "UpdateRoomMetadataType0",
    "UpdateRoomUsersAccessesType0",
    "UpdateSchema",
    "UpdateThreadMetadata",
    "UpdateThreadMetadataMetadata",
    "UpsertRoom",
    "UpsertRoomCreate",
    "UpsertRoomCreateGroupsAccessesType0",
    "UpsertRoomCreateMetadataType0",
    "UpsertRoomCreateUsersAccessesType0",
    "UpsertRoomsRoomIdFilesBody",
    "UpsertRoomUpdate",
    "UpsertRoomUpdateGroupsAccessesType0",
    "UpsertRoomUpdateMetadataType0",
    "UpsertRoomUpdateUsersAccessesType0",
    "UserRoomSubscriptionSettings",
    "UserRoomSubscriptionSettingsTextMentions",
    "UserRoomSubscriptionSettingsThreads",
    "UserSubscription",
    "WebKnowledgeSourceLink",
    "WebKnowledgeSourceLinkType",
    "WebKnowledgeSourceStatus",
)
