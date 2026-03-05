from __future__ import annotations

import base64
import hashlib
import hmac
import json
from unittest.mock import patch

import pytest

from webhooks import (
    WebhookHandler,
    is_custom_notification_event,
    is_text_mention_notification_event,
    is_thread_notification_event,
)

SECRET = "whsec_sFOoBaR78ZZNyOl0TxbObFZWeo3rLg+d"

USER_ENTERED_HEADERS = {
    "webhook-id": "msg_2KvLUhLIHZtzZnNgUWv3PhGYf5f",
    "webhook-timestamp": "1674850126",
}

USER_ENTERED_BODY = {
    "data": {
        "projectId": "605a50b01a36d5ea7a2e9104",
        "connectionId": 2196,
        "enteredAt": "2023-01-27T20:08:40.693Z",
        "numActiveUsers": 2,
        "roomId": "hero-grid-12-01-2022",
        "userId": "iepRYL2EWVHx8IcKVqhvZ6xljn",
        "userInfo": None,
    },
    "type": "userEntered",
}

RAW_USER_ENTERED_BODY = json.dumps(USER_ENTERED_BODY, separators=(",", ":"))


def _generate_signature(secret: str, message_id: str, timestamp: str, body: str) -> str:
    """Reproduce the svix signing algorithm used by the TS tests."""
    secret_key = base64.b64decode(secret[len("whsec_") :])
    to_sign = f"{message_id}.{timestamp}.{body}".encode()
    sig = base64.b64encode(hmac.new(secret_key, to_sign, hashlib.sha256).digest()).decode()
    return f"v1,{sig}"


# ---------------------------------------------------------------------------
# Constructor validation
# ---------------------------------------------------------------------------


class TestConstructorValidation:
    @pytest.mark.parametrize("invalid_secret", [None, "", "not_a_valid_secret"])
    def test_rejects_invalid_secrets(self, invalid_secret):
        with pytest.raises(ValueError):
            WebhookHandler(invalid_secret)


# ---------------------------------------------------------------------------
# verify_request
# ---------------------------------------------------------------------------


class TestVerifyRequest:
    @pytest.mark.parametrize(
        "event_type, data",
        [
            ("userEntered", USER_ENTERED_BODY["data"]),
            (
                "storageUpdated",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "hero-grid-12-01-2022",
                    "updatedAt": "2023-01-27T20:27:48.744Z",
                },
            ),
            (
                "userLeft",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "connectionId": 34597,
                    "leftAt": "2023-01-27T20:33:23.737Z",
                    "numActiveUsers": 4,
                    "roomId": "examples-hero-21-07-2022",
                    "userId": "zY8DF2NMqvKrzkuL5KkDIYY-da",
                    "userInfo": None,
                },
            ),
            (
                "roomCreated",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "createdAt": "2023-01-27T20:33:23.737Z",
                    "roomId": "examples-hero-21-07-2022",
                },
            ),
            (
                "roomDeleted",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "deletedAt": "2023-01-27T20:33:23.737Z",
                    "roomId": "examples-hero-21-07-2022",
                },
            ),
            (
                "commentCreated",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "commentId": "605a50b01a36d5ea7a2e9104",
                    "content": "Hello world",
                    "createdAt": "2023-01-27T20:33:23.737Z",
                    "createdBy": "authorId",
                    "roomId": "examples-hero-21-07-2022",
                },
            ),
            (
                "commentDeleted",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "commentId": "605a50b01a36d5ea7a2e9104",
                    "deletedAt": "2023-01-27T20:33:23.737Z",
                    "roomId": "examples-hero-21-07-2022",
                },
            ),
            (
                "commentEdited",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "commentId": "605a50b01a36d5ea7a2e9104",
                    "content": "Hello world",
                    "editedAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "commentReactionAdded",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "commentId": "605a50b01a36d5ea7a2e9104",
                    "emoji": "\U0001f44d",
                    "roomId": "examples-hero-21-07-2022",
                },
            ),
            (
                "commentReactionRemoved",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "commentId": "605a50b01a36d5ea7a2e9104",
                    "emoji": "\U0001f44d",
                    "roomId": "examples-hero-21-07-2022",
                },
            ),
            (
                "threadMetadataUpdated",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "updatedBy": "authorId",
                    "updatedAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "commentMetadataUpdated",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "commentId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "updatedBy": "authorId",
                    "updatedAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "threadCreated",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "createdBy": "authorId",
                    "createdAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "threadDeleted",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "deletedAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "notification",
                {
                    "kind": "thread",
                    "channel": "email",
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "userId": "userId",
                    "createdAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "notification",
                {
                    "kind": "textMention",
                    "channel": "email",
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                    "mentionId": "605a50b01a36d5ea7a2e9104",
                    "userId": "userId",
                    "createdAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "notification",
                {
                    "kind": "$custom",
                    "channel": "email",
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                    "subjectId": "605a50ba1a36d5ea7a2e9104",
                    "userId": "userId",
                    "createdAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "threadMarkedAsResolved",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "updatedBy": "authorId",
                    "updatedAt": "2023-01-27T20:33:23.737Z",
                },
            ),
            (
                "threadMarkedAsUnresolved",
                {
                    "projectId": "605a50b01a36d5ea7a2e9104",
                    "threadId": "605a50b01a36d5ea7a2e9104",
                    "roomId": "examples-hero-21-07-2022",
                    "updatedBy": "authorId",
                    "updatedAt": "2023-01-27T20:33:23.737Z",
                },
            ),
        ],
        ids=[
            "userEntered",
            "storageUpdated",
            "userLeft",
            "roomCreated",
            "roomDeleted",
            "commentCreated",
            "commentDeleted",
            "commentEdited",
            "commentReactionAdded",
            "commentReactionRemoved",
            "threadMetadataUpdated",
            "commentMetadataUpdated",
            "threadCreated",
            "threadDeleted",
            "notification/thread",
            "notification/textMention",
            "notification/$custom",
            "threadMarkedAsResolved",
            "threadMarkedAsUnresolved",
        ],
    )
    def test_verifies_event(self, event_type, data):
        now_ms = 1674851609000
        timestamp = str(now_ms // 1000)

        body = {"data": data, "type": event_type}
        raw_body = json.dumps(body, separators=(",", ":"))

        webhook_id = "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs"
        headers = {
            "webhook-id": webhook_id,
            "webhook-timestamp": timestamp,
            "webhook-signature": _generate_signature(SECRET, webhook_id, timestamp, raw_body),
        }

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=now_ms / 1000):
            event = handler.verify_request(headers=headers, raw_body=raw_body)

        assert event == body

    def test_verifies_ydoc_updated_event(self):
        ydoc_updated = {
            "data": {
                "appId": "605a50b01a36d5ea7a2e9104",
                "roomId": "hero-grid-12-01-2022",
                "updatedAt": "2023-01-27T20:27:48.744Z",
            },
            "type": "ydocUpdated",
        }
        raw_body = json.dumps(ydoc_updated, separators=(",", ":"))

        webhook_id = "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs"
        timestamp = "1674851522"
        headers = {
            "webhook-id": webhook_id,
            "webhook-timestamp": timestamp,
            "webhook-signature": _generate_signature(SECRET, webhook_id, timestamp, raw_body),
        }

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=1674851522):
            event = handler.verify_request(headers=headers, raw_body=raw_body)

        assert event == ydoc_updated

    def test_verifies_event_with_multiple_signatures(self):
        another_secret = "whsec_2KvOJ6yK9FO0hElL0JYkM3jPwBs="

        sig1 = _generate_signature(
            SECRET,
            USER_ENTERED_HEADERS["webhook-id"],
            USER_ENTERED_HEADERS["webhook-timestamp"],
            RAW_USER_ENTERED_BODY,
        )
        sig2 = _generate_signature(
            another_secret,
            USER_ENTERED_HEADERS["webhook-id"],
            USER_ENTERED_HEADERS["webhook-timestamp"],
            RAW_USER_ENTERED_BODY,
        )

        headers = {
            **USER_ENTERED_HEADERS,
            "webhook-signature": f"{sig1} {sig2}",
        }

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=1674850126):
            event = handler.verify_request(headers=headers, raw_body=RAW_USER_ENTERED_BODY)

        assert event == USER_ENTERED_BODY

    def test_raises_on_non_string_raw_body(self):
        sig = _generate_signature(
            SECRET,
            USER_ENTERED_HEADERS["webhook-id"],
            USER_ENTERED_HEADERS["webhook-timestamp"],
            RAW_USER_ENTERED_BODY,
        )
        headers = {**USER_ENTERED_HEADERS, "webhook-signature": sig}

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=1674850126):
            with pytest.raises(ValueError, match="Invalid raw_body"):
                handler.verify_request(headers=headers, raw_body={})  # type: ignore[arg-type]

    def test_raises_on_invalid_signature(self):
        headers = {
            **USER_ENTERED_HEADERS,
            "webhook-signature": "v1,invalid_signature",
        }

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=1674850126):
            with pytest.raises(ValueError, match="Invalid signature"):
                handler.verify_request(headers=headers, raw_body=RAW_USER_ENTERED_BODY)

    def test_raises_on_invalid_timestamp(self):
        sig = _generate_signature(
            SECRET,
            USER_ENTERED_HEADERS["webhook-id"],
            USER_ENTERED_HEADERS["webhook-timestamp"],
            RAW_USER_ENTERED_BODY,
        )
        headers = {
            **USER_ENTERED_HEADERS,
            "webhook-signature": sig,
            "webhook-timestamp": "invalid_timestamp",
        }

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=1674850126):
            with pytest.raises(ValueError, match="Invalid timestamp"):
                handler.verify_request(headers=headers, raw_body=RAW_USER_ENTERED_BODY)

    def test_raises_on_future_timestamp(self):
        ten_minutes_ago_s = 1674850126 - 10 * 60

        sig = _generate_signature(
            SECRET,
            USER_ENTERED_HEADERS["webhook-id"],
            USER_ENTERED_HEADERS["webhook-timestamp"],
            RAW_USER_ENTERED_BODY,
        )
        headers = {**USER_ENTERED_HEADERS, "webhook-signature": sig}

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=ten_minutes_ago_s):
            with pytest.raises(ValueError, match="Timestamp in the future"):
                handler.verify_request(headers=headers, raw_body=RAW_USER_ENTERED_BODY)

    def test_raises_on_old_timestamp(self):
        ten_minutes_later_s = 1674850126 + 10 * 60

        sig = _generate_signature(
            SECRET,
            USER_ENTERED_HEADERS["webhook-id"],
            USER_ENTERED_HEADERS["webhook-timestamp"],
            RAW_USER_ENTERED_BODY,
        )
        headers = {**USER_ENTERED_HEADERS, "webhook-signature": sig}

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=ten_minutes_later_s):
            with pytest.raises(ValueError, match="Timestamp too old"):
                handler.verify_request(headers=headers, raw_body=RAW_USER_ENTERED_BODY)

    def test_raises_on_unsupported_event_type(self):
        body = {
            "data": {
                "projectId": "605a50b01a36d5ea7a2e9104",
                "roomId": "hero-grid-12-01-2022",
                "updatedAt": "2023-01-27T20:27:48.744Z",
            },
            "type": "unsupportedEventType",
        }
        raw_body = json.dumps(body, separators=(",", ":"))

        webhook_id = "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs"
        timestamp = "1674851522"
        headers = {
            "webhook-id": webhook_id,
            "webhook-timestamp": timestamp,
            "webhook-signature": _generate_signature(SECRET, webhook_id, timestamp, raw_body),
        }

        handler = WebhookHandler(SECRET)
        with patch("webhooks.time.time", return_value=1674851522):
            with pytest.raises(ValueError, match="Unknown event type"):
                handler.verify_request(headers=headers, raw_body=raw_body)


# ---------------------------------------------------------------------------
# Type guards
# ---------------------------------------------------------------------------


class TestIsThreadNotificationEvent:
    @pytest.mark.parametrize(
        "name, event, expected",
        [
            (
                "notification/thread",
                {
                    "type": "notification",
                    "data": {
                        "kind": "thread",
                        "channel": "email",
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "roomId": "examples-hero-21-07-2022",
                        "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                        "threadId": "605a50b01a36d5ea7a2e9104",
                        "userId": "userId",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "triggeredAt": "2023-01-27T20:28:23.737Z",
                    },
                },
                True,
            ),
            (
                "notification/textMention",
                {
                    "type": "notification",
                    "data": {
                        "kind": "textMention",
                        "channel": "email",
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "roomId": "examples-hero-21-07-2022",
                        "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                        "mentionId": "605a50b01a36d5ea7a2e9104",
                        "userId": "userId",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "triggeredAt": "2023-01-27T20:28:23.737Z",
                    },
                },
                False,
            ),
            (
                "commentCreated",
                {
                    "type": "commentCreated",
                    "data": {
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "threadId": "605a50b01a36d5ea7a2e9104",
                        "commentId": "605a50b01a36d5ea7a2e9104",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "createdBy": "authorId",
                        "roomId": "examples-hero-21-07-2022",
                    },
                },
                False,
            ),
        ],
        ids=["notification/thread", "notification/textMention", "commentCreated"],
    )
    def test_is_thread_notification(self, name, event, expected):
        assert is_thread_notification_event(event) is expected


class TestIsTextMentionNotificationEvent:
    @pytest.mark.parametrize(
        "name, event, expected",
        [
            (
                "notification/textMention",
                {
                    "type": "notification",
                    "data": {
                        "kind": "textMention",
                        "channel": "email",
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "roomId": "examples-hero-21-07-2022",
                        "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                        "mentionId": "605a50b01a36d5ea7a2e9104",
                        "userId": "userId",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "triggeredAt": "2023-01-27T20:28:23.737Z",
                    },
                },
                True,
            ),
            (
                "notification/thread",
                {
                    "type": "notification",
                    "data": {
                        "kind": "thread",
                        "channel": "email",
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "roomId": "examples-hero-21-07-2022",
                        "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                        "threadId": "605a50b01a36d5ea7a2e9104",
                        "userId": "userId",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "triggeredAt": "2023-01-27T20:28:23.737Z",
                    },
                },
                False,
            ),
            (
                "commentCreated",
                {
                    "type": "commentCreated",
                    "data": {
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "threadId": "605a50b01a36d5ea7a2e9104",
                        "commentId": "605a50b01a36d5ea7a2e9104",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "createdBy": "authorId",
                        "roomId": "examples-hero-21-07-2022",
                    },
                },
                False,
            ),
        ],
        ids=["notification/textMention", "notification/thread", "commentCreated"],
    )
    def test_is_text_mention_notification(self, name, event, expected):
        assert is_text_mention_notification_event(event) is expected


class TestIsCustomNotificationEvent:
    @pytest.mark.parametrize(
        "name, event, expected",
        [
            (
                "notification/textMention",
                {
                    "type": "notification",
                    "data": {
                        "kind": "textMention",
                        "channel": "email",
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "roomId": "examples-hero-21-07-2022",
                        "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                        "mentionId": "605a50b01a36d5ea7a2e9104",
                        "userId": "userId",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "triggeredAt": "2023-01-27T20:28:23.737Z",
                    },
                },
                False,
            ),
            (
                "notification/thread",
                {
                    "type": "notification",
                    "data": {
                        "kind": "thread",
                        "channel": "email",
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "roomId": "examples-hero-21-07-2022",
                        "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                        "threadId": "605a50b01a36d5ea7a2e9104",
                        "userId": "userId",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "triggeredAt": "2023-01-27T20:28:23.737Z",
                    },
                },
                False,
            ),
            (
                "notification/$customKind",
                {
                    "type": "notification",
                    "data": {
                        "kind": "$fileUploaded",
                        "channel": "email",
                        "projectId": "605a50b01a36d5ea7a2e9104",
                        "roomId": "examples-hero-21-07-2022",
                        "userId": "user-0",
                        "subjectId": "subject-0",
                        "inboxNotificationId": "605a50b01a36d5ea7a2e9104",
                        "createdAt": "2023-01-27T20:33:23.737Z",
                        "triggeredAt": "2023-01-27T20:28:23.737Z",
                    },
                },
                True,
            ),
        ],
        ids=["notification/textMention", "notification/thread", "notification/$customKind"],
    )
    def test_is_custom_notification(self, name, event, expected):
        assert is_custom_notification_event(event) is expected
