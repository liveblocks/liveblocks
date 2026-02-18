//! Inbox notifications REST API.
//!
//! Endpoints under `/v2/c/inbox-notifications/...` (user-level)
//! and `/v2/c/rooms/{roomId}/inbox-notifications/...` (room-level).

use serde_json::Value as JsonValue;

use crate::platform::HttpClient;

use super::ApiClient;

impl<H: HttpClient> ApiClient<H> {
    // -- User-level inbox notifications --

    /// List inbox notifications (paginated).
    pub async fn get_inbox_notifications(
        &self,
        cursor: Option<&str>,
        query: Option<&str>,
    ) -> Result<JsonValue, String> {
        let mut path = "/v2/c/inbox-notifications".to_string();
        let mut params = Vec::new();
        if let Some(c) = cursor {
            params.push(format!("cursor={}", c));
        }
        if let Some(q) = query {
            params.push(format!("query={}", q));
        }
        if !params.is_empty() {
            path.push('?');
            path.push_str(&params.join("&"));
        }

        let resp = self.get(&path).await?;
        parse_json_response(&resp.body)
    }

    /// Get inbox notifications delta since a timestamp.
    pub async fn get_inbox_notifications_delta(
        &self,
        since: &str,
        query: Option<&str>,
    ) -> Result<JsonValue, String> {
        let mut path = format!("/v2/c/inbox-notifications/delta?since={}", since);
        if let Some(q) = query {
            path.push_str(&format!("&query={}", q));
        }

        let resp = self.get(&path).await?;
        parse_json_response(&resp.body)
    }

    /// Get unread inbox notification count.
    pub async fn get_inbox_notification_count(&self) -> Result<JsonValue, String> {
        let resp = self.get("/v2/c/inbox-notifications/count").await?;
        parse_json_response(&resp.body)
    }

    /// Mark inbox notifications as read.
    pub async fn mark_inbox_notifications_read(
        &self,
        notification_ids: &[&str],
    ) -> Result<(), String> {
        let body = serde_json::json!({
            "inboxNotificationIds": notification_ids,
        });
        self.post("/v2/c/inbox-notifications/read", &body.to_string())
            .await?;
        Ok(())
    }

    /// Mark all inbox notifications as read.
    pub async fn mark_all_inbox_notifications_read(&self) -> Result<(), String> {
        let body = serde_json::json!({
            "inboxNotificationIds": "all",
        });
        self.post("/v2/c/inbox-notifications/read", &body.to_string())
            .await?;
        Ok(())
    }

    /// Delete all inbox notifications.
    pub async fn delete_all_inbox_notifications(&self) -> Result<(), String> {
        let resp = self.delete("/v2/c/inbox-notifications").await?;
        if resp.status >= 200 && resp.status < 300 {
            Ok(())
        } else {
            Err(format!(
                "Delete all inbox notifications failed: {}",
                resp.status
            ))
        }
    }

    /// Delete a single inbox notification.
    pub async fn delete_inbox_notification(
        &self,
        notification_id: &str,
    ) -> Result<(), String> {
        let path = format!("/v2/c/inbox-notifications/{}", notification_id);
        let resp = self.delete(&path).await?;
        if resp.status >= 200 && resp.status < 300 {
            Ok(())
        } else {
            Err(format!(
                "Delete inbox notification failed: {}",
                resp.status
            ))
        }
    }

    // -- Room-level inbox notifications --

    /// Mark room inbox notifications as read.
    pub async fn mark_room_inbox_notifications_read(
        &self,
        room_id: &str,
        notification_ids: &[&str],
    ) -> Result<(), String> {
        let path = format!("/v2/c/rooms/{}/inbox-notifications/read", room_id);
        let body = serde_json::json!({
            "inboxNotificationIds": notification_ids,
        });
        self.post(&path, &body.to_string()).await?;
        Ok(())
    }

    // -- Notification settings --

    /// Get notification settings.
    pub async fn get_notification_settings(&self) -> Result<JsonValue, String> {
        let resp = self.get("/v2/c/notification-settings").await?;
        parse_json_response(&resp.body)
    }

    /// Update notification settings.
    pub async fn update_notification_settings(
        &self,
        settings: &JsonValue,
    ) -> Result<JsonValue, String> {
        let resp = self
            .post("/v2/c/notification-settings", &settings.to_string())
            .await?;
        parse_json_response(&resp.body)
    }

    // -- Room subscription settings --

    /// Get room subscription settings.
    pub async fn get_room_subscription_settings(
        &self,
        room_id: &str,
    ) -> Result<JsonValue, String> {
        let path = format!("/v2/c/rooms/{}/subscription-settings", room_id);
        let resp = self.get(&path).await?;
        parse_json_response(&resp.body)
    }

    /// Update room subscription settings.
    pub async fn update_room_subscription_settings(
        &self,
        room_id: &str,
        settings: &JsonValue,
    ) -> Result<JsonValue, String> {
        let path = format!("/v2/c/rooms/{}/subscription-settings", room_id);
        let resp = self.post(&path, &settings.to_string()).await?;
        parse_json_response(&resp.body)
    }
}

fn parse_json_response(body: &str) -> Result<JsonValue, String> {
    serde_json::from_str(body).map_err(|e| format!("JSON parse error: {}", e))
}
