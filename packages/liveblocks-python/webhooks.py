from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Literal, TypedDict, TypeGuard, Union

_SECRET_PREFIX = "whsec_"
_TOLERANCE_IN_SECONDS = 5 * 60  # 5 minutes

_KNOWN_EVENT_TYPES = frozenset(
    {
        "storageUpdated",
        "userEntered",
        "userLeft",
        "roomCreated",
        "roomDeleted",
        "commentCreated",
        "commentEdited",
        "commentDeleted",
        "commentReactionAdded",
        "commentReactionRemoved",
        "commentMetadataUpdated",
        "threadMetadataUpdated",
        "threadCreated",
        "threadDeleted",
        "ydocUpdated",
        "notification",
        "threadMarkedAsResolved",
        "threadMarkedAsUnresolved",
    }
)

NotificationChannel = Literal["email", "slack", "teams", "webPush"]

__all__ = [
    "WebhookHandler",
    "WebhookEvent",
    "NotificationEvent",
    "NotificationChannel",
    "StorageUpdatedEvent",
    "UserEnteredEvent",
    "UserLeftEvent",
    "RoomCreatedEvent",
    "RoomDeletedEvent",
    "CommentCreatedEvent",
    "CommentEditedEvent",
    "CommentDeletedEvent",
    "CommentReactionAddedEvent",
    "CommentReactionRemovedEvent",
    "CommentMetadataUpdatedEvent",
    "ThreadMetadataUpdatedEvent",
    "ThreadCreatedEvent",
    "ThreadDeletedEvent",
    "ThreadMarkedAsResolvedEvent",
    "ThreadMarkedAsUnresolvedEvent",
    "YDocUpdatedEvent",
    "ThreadNotificationEvent",
    "TextMentionNotificationEvent",
    "CustomNotificationEvent",
    "is_thread_notification_event",
    "is_text_mention_notification_event",
    "is_custom_notification_event",
]

# ---------------------------------------------------------------------------
# Event data TypedDicts
# ---------------------------------------------------------------------------


class _StorageUpdatedData(TypedDict):
    roomId: str
    projectId: str
    updatedAt: str  # ISO 8601


class _UserEnteredData(TypedDict):
    projectId: str
    roomId: str
    connectionId: int
    userId: str | None
    userInfo: dict[str, Any] | None
    enteredAt: str  # ISO 8601
    numActiveUsers: int


class _UserLeftData(TypedDict):
    projectId: str
    roomId: str
    connectionId: int
    userId: str | None
    userInfo: dict[str, Any] | None
    leftAt: str  # ISO 8601
    numActiveUsers: int


class _RoomCreatedData(TypedDict):
    projectId: str
    roomId: str
    createdAt: str  # ISO 8601


class _RoomDeletedData(TypedDict):
    projectId: str
    roomId: str
    deletedAt: str  # ISO 8601


class _CommentCreatedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    commentId: str
    createdAt: str  # ISO 8601
    createdBy: str


class _CommentEditedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    commentId: str
    editedAt: str  # ISO 8601


class _CommentDeletedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    commentId: str
    deletedAt: str  # ISO 8601


class _CommentReactionAddedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    commentId: str
    emoji: str
    addedAt: str  # ISO 8601
    addedBy: str


class _CommentReactionRemovedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    commentId: str
    emoji: str
    removedAt: str  # ISO 8601
    removedBy: str


class _CommentMetadataUpdatedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    commentId: str
    updatedAt: str  # ISO 8601
    updatedBy: str


class _ThreadMetadataUpdatedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    updatedAt: str  # ISO 8601
    updatedBy: str


class _ThreadCreatedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    createdAt: str  # ISO 8601
    createdBy: str


class _ThreadDeletedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    deletedAt: str  # ISO 8601


class _ThreadMarkedAsResolvedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    updatedAt: str  # ISO 8601
    updatedBy: str


class _ThreadMarkedAsUnresolvedData(TypedDict):
    projectId: str
    roomId: str
    threadId: str
    updatedAt: str  # ISO 8601
    updatedBy: str


class _YDocUpdatedData(TypedDict):
    projectId: str
    roomId: str
    updatedAt: str  # ISO 8601


class _ThreadNotificationData(TypedDict):
    channel: NotificationChannel
    kind: Literal["thread"]
    projectId: str
    roomId: str
    userId: str
    threadId: str
    inboxNotificationId: str
    createdAt: str  # ISO 8601
    triggeredAt: str  # ISO 8601


class _TextMentionNotificationData(TypedDict):
    channel: NotificationChannel
    kind: Literal["textMention"]
    projectId: str
    roomId: str
    userId: str
    mentionId: str
    inboxNotificationId: str
    createdAt: str  # ISO 8601
    triggeredAt: str  # ISO 8601


class _CustomNotificationData(TypedDict):
    channel: NotificationChannel
    kind: str  # starts with "$"
    projectId: str
    roomId: str | None
    userId: str
    subjectId: str
    inboxNotificationId: str
    createdAt: str  # ISO 8601
    triggeredAt: str  # ISO 8601


# ---------------------------------------------------------------------------
# Event TypedDicts
# ---------------------------------------------------------------------------


class StorageUpdatedEvent(TypedDict):
    type: Literal["storageUpdated"]
    data: _StorageUpdatedData


class UserEnteredEvent(TypedDict):
    type: Literal["userEntered"]
    data: _UserEnteredData


class UserLeftEvent(TypedDict):
    type: Literal["userLeft"]
    data: _UserLeftData


class RoomCreatedEvent(TypedDict):
    type: Literal["roomCreated"]
    data: _RoomCreatedData


class RoomDeletedEvent(TypedDict):
    type: Literal["roomDeleted"]
    data: _RoomDeletedData


class CommentCreatedEvent(TypedDict):
    type: Literal["commentCreated"]
    data: _CommentCreatedData


class CommentEditedEvent(TypedDict):
    type: Literal["commentEdited"]
    data: _CommentEditedData


class CommentDeletedEvent(TypedDict):
    type: Literal["commentDeleted"]
    data: _CommentDeletedData


class CommentReactionAddedEvent(TypedDict):
    type: Literal["commentReactionAdded"]
    data: _CommentReactionAddedData


class CommentReactionRemovedEvent(TypedDict):
    type: Literal["commentReactionRemoved"]
    data: _CommentReactionRemovedData


class CommentMetadataUpdatedEvent(TypedDict):
    type: Literal["commentMetadataUpdated"]
    data: _CommentMetadataUpdatedData


class ThreadMetadataUpdatedEvent(TypedDict):
    type: Literal["threadMetadataUpdated"]
    data: _ThreadMetadataUpdatedData


class ThreadCreatedEvent(TypedDict):
    type: Literal["threadCreated"]
    data: _ThreadCreatedData


class ThreadDeletedEvent(TypedDict):
    type: Literal["threadDeleted"]
    data: _ThreadDeletedData


class ThreadMarkedAsResolvedEvent(TypedDict):
    type: Literal["threadMarkedAsResolved"]
    data: _ThreadMarkedAsResolvedData


class ThreadMarkedAsUnresolvedEvent(TypedDict):
    type: Literal["threadMarkedAsUnresolved"]
    data: _ThreadMarkedAsUnresolvedData


class YDocUpdatedEvent(TypedDict):
    type: Literal["ydocUpdated"]
    data: _YDocUpdatedData


class ThreadNotificationEvent(TypedDict):
    type: Literal["notification"]
    data: _ThreadNotificationData


class TextMentionNotificationEvent(TypedDict):
    type: Literal["notification"]
    data: _TextMentionNotificationData


class CustomNotificationEvent(TypedDict):
    type: Literal["notification"]
    data: _CustomNotificationData


NotificationEvent = Union[
    ThreadNotificationEvent,
    TextMentionNotificationEvent,
    CustomNotificationEvent,
]

WebhookEvent = Union[
    StorageUpdatedEvent,
    UserEnteredEvent,
    UserLeftEvent,
    RoomCreatedEvent,
    RoomDeletedEvent,
    CommentCreatedEvent,
    CommentEditedEvent,
    CommentDeletedEvent,
    CommentReactionAddedEvent,
    CommentReactionRemovedEvent,
    CommentMetadataUpdatedEvent,
    ThreadMetadataUpdatedEvent,
    ThreadCreatedEvent,
    ThreadDeletedEvent,
    ThreadMarkedAsResolvedEvent,
    ThreadMarkedAsUnresolvedEvent,
    YDocUpdatedEvent,
    ThreadNotificationEvent,
    TextMentionNotificationEvent,
    CustomNotificationEvent,
]


# ---------------------------------------------------------------------------
# Type guards
# ---------------------------------------------------------------------------


def _is_custom_kind(value: object) -> bool:
    return isinstance(value, str) and value.startswith("$")


def is_thread_notification_event(event: WebhookEvent) -> TypeGuard[ThreadNotificationEvent]:
    """Check whether *event* is a thread notification event."""
    return event["type"] == "notification" and event["data"].get("kind") == "thread"


def is_text_mention_notification_event(event: WebhookEvent) -> TypeGuard[TextMentionNotificationEvent]:
    """Check whether *event* is a text-mention notification event."""
    return event["type"] == "notification" and event["data"].get("kind") == "textMention"


def is_custom_notification_event(event: WebhookEvent) -> TypeGuard[CustomNotificationEvent]:
    """Check whether *event* is a custom notification event."""
    return event["type"] == "notification" and _is_custom_kind(event["data"].get("kind"))


# ---------------------------------------------------------------------------
# WebhookHandler
# ---------------------------------------------------------------------------


class WebhookHandler:
    """Verify incoming Liveblocks webhook requests.

    Usage::

        handler = WebhookHandler("whsec_...")
        event = handler.verify_request(headers=request.headers, raw_body=request.body)
    """

    def __init__(self, secret: str) -> None:
        if not secret or not isinstance(secret, str):
            raise ValueError("Secret is required and must be a non-empty string")

        if not secret.startswith(_SECRET_PREFIX):
            raise ValueError("Invalid secret, must start with whsec_")

        secret_key = secret[len(_SECRET_PREFIX) :]
        try:
            self._secret_bytes = base64.b64decode(secret_key)
        except Exception:
            raise ValueError(
                "Webhook secret contains invalid base64 after the 'whsec_' prefix. "
                "Please copy the full secret from your Liveblocks dashboard."
            ) from None

    def verify_request(self, *, headers: dict[str, str], raw_body: str) -> WebhookEvent:
        """Verify a webhook request and return the parsed event.

        Args:
            headers: The HTTP headers as a string-to-string mapping.
            raw_body: The raw request body as a string (do **not** parse it first).

        Returns:
            The parsed webhook event dictionary.

        Raises:
            ValueError: If the request cannot be verified.
        """
        webhook_id, timestamp, raw_signatures = self._verify_headers(headers)

        if not isinstance(raw_body, str):
            raise ValueError(
                f"Invalid raw_body, must be a string, got {type(raw_body).__name__!r} instead. "
                "Make sure you pass the raw request body string, not a parsed object."
            )

        self._verify_timestamp(timestamp)

        signature = self._sign(f"{webhook_id}.{timestamp}.{raw_body}")

        expected_signatures = [
            parts[1] for raw_sig in raw_signatures.split(" ") if len(parts := raw_sig.split(",")) > 1
        ]

        if signature not in expected_signatures:
            raise ValueError(f"Invalid signature, expected one of {', '.join(expected_signatures)}, got {signature}")

        event: WebhookEvent = json.loads(raw_body)

        self._verify_event_type(event)

        return event

    # -- private helpers ----------------------------------------------------

    @staticmethod
    def _verify_headers(headers: dict[str, str]) -> tuple[str, str, str]:
        normalized = {k.lower(): v for k, v in headers.items()}

        webhook_id = normalized.get("webhook-id")
        if not isinstance(webhook_id, str):
            raise ValueError("Invalid webhook-id header")

        timestamp = normalized.get("webhook-timestamp")
        if not isinstance(timestamp, str):
            raise ValueError("Invalid webhook-timestamp header")

        raw_signatures = normalized.get("webhook-signature")
        if not isinstance(raw_signatures, str):
            raise ValueError("Invalid webhook-signature header")

        return webhook_id, timestamp, raw_signatures

    def _sign(self, content: str) -> str:
        mac = hmac.new(self._secret_bytes, content.encode(), hashlib.sha256)
        return base64.b64encode(mac.digest()).decode()

    @staticmethod
    def _verify_timestamp(timestamp_header: str) -> None:
        try:
            timestamp = int(timestamp_header)
        except ValueError:
            raise ValueError("Invalid timestamp") from None

        now = int(time.time())

        if timestamp < now - _TOLERANCE_IN_SECONDS:
            raise ValueError("Timestamp too old")

        if timestamp > now + _TOLERANCE_IN_SECONDS:
            raise ValueError("Timestamp in the future")

    @staticmethod
    def _verify_event_type(event: WebhookEvent) -> None:
        event_type = event.get("type") if isinstance(event, dict) else None

        if event_type and event_type in _KNOWN_EVENT_TYPES:
            if event_type == "notification":
                kind = event["data"].get("kind")
                if kind in ("thread", "textMention") or _is_custom_kind(kind):
                    return
                raise ValueError(f"Unknown notification kind: {kind!r}")
            return

        raise ValueError("Unknown event type, please upgrade to a higher version of liveblocks")
