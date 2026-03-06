//! Threads, comments, and reactions REST API.
//!
//! Endpoints under `/v2/c/rooms/{roomId}/threads/...`.

use serde_json::Value as JsonValue;

use crate::platform::HttpClient;

use super::ApiClient;

impl<H: HttpClient> ApiClient<H> {
    // -- Threads --

    /// List threads in a room (paginated).
    pub async fn get_threads(
        &self,
        room_id: &str,
        cursor: Option<&str>,
        query: Option<&str>,
    ) -> Result<JsonValue, String> {
        let mut path = format!("/v2/c/rooms/{}/threads", room_id);
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

    /// Get threads delta since a timestamp.
    pub async fn get_threads_delta(
        &self,
        room_id: &str,
        since: &str,
    ) -> Result<JsonValue, String> {
        let path = format!("/v2/c/rooms/{}/threads/delta?since={}", room_id, since);
        let resp = self.get(&path).await?;
        parse_json_response(&resp.body)
    }

    /// Create a new thread.
    pub async fn create_thread(
        &self,
        room_id: &str,
        body: &JsonValue,
    ) -> Result<JsonValue, String> {
        let path = format!("/v2/c/rooms/{}/threads", room_id);
        let resp = self.post(&path, &body.to_string()).await?;
        parse_json_response(&resp.body)
    }

    /// Delete a thread.
    pub async fn delete_thread(
        &self,
        room_id: &str,
        thread_id: &str,
    ) -> Result<(), String> {
        let path = format!("/v2/c/rooms/{}/threads/{}", room_id, thread_id);
        let resp = self.delete(&path).await?;
        if resp.status >= 200 && resp.status < 300 {
            Ok(())
        } else {
            Err(format!("Delete thread failed: {}", resp.status))
        }
    }

    /// Edit thread metadata.
    pub async fn edit_thread_metadata(
        &self,
        room_id: &str,
        thread_id: &str,
        metadata: &JsonValue,
    ) -> Result<JsonValue, String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/metadata",
            room_id, thread_id
        );
        let resp = self.post(&path, &metadata.to_string()).await?;
        parse_json_response(&resp.body)
    }

    /// Mark a thread as resolved.
    pub async fn mark_thread_resolved(
        &self,
        room_id: &str,
        thread_id: &str,
    ) -> Result<(), String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/mark-as-resolved",
            room_id, thread_id
        );
        self.post(&path, "{}").await?;
        Ok(())
    }

    /// Mark a thread as unresolved.
    pub async fn mark_thread_unresolved(
        &self,
        room_id: &str,
        thread_id: &str,
    ) -> Result<(), String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/mark-as-unresolved",
            room_id, thread_id
        );
        self.post(&path, "{}").await?;
        Ok(())
    }

    /// Subscribe to a thread.
    pub async fn subscribe_to_thread(
        &self,
        room_id: &str,
        thread_id: &str,
    ) -> Result<(), String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/subscribe",
            room_id, thread_id
        );
        self.post(&path, "{}").await?;
        Ok(())
    }

    /// Unsubscribe from a thread.
    pub async fn unsubscribe_from_thread(
        &self,
        room_id: &str,
        thread_id: &str,
    ) -> Result<(), String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/unsubscribe",
            room_id, thread_id
        );
        self.post(&path, "{}").await?;
        Ok(())
    }

    // -- Comments --

    /// Create a comment on a thread.
    pub async fn create_comment(
        &self,
        room_id: &str,
        thread_id: &str,
        body: &JsonValue,
    ) -> Result<JsonValue, String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/comments",
            room_id, thread_id
        );
        let resp = self.post(&path, &body.to_string()).await?;
        parse_json_response(&resp.body)
    }

    /// Edit a comment.
    pub async fn edit_comment(
        &self,
        room_id: &str,
        thread_id: &str,
        comment_id: &str,
        body: &JsonValue,
    ) -> Result<JsonValue, String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/comments/{}",
            room_id, thread_id, comment_id
        );
        let resp = self.post(&path, &body.to_string()).await?;
        parse_json_response(&resp.body)
    }

    /// Delete a comment.
    pub async fn delete_comment(
        &self,
        room_id: &str,
        thread_id: &str,
        comment_id: &str,
    ) -> Result<(), String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/comments/{}",
            room_id, thread_id, comment_id
        );
        let resp = self.delete(&path).await?;
        if resp.status >= 200 && resp.status < 300 {
            Ok(())
        } else {
            Err(format!("Delete comment failed: {}", resp.status))
        }
    }

    // -- Reactions --

    /// Add a reaction to a comment.
    pub async fn add_reaction(
        &self,
        room_id: &str,
        thread_id: &str,
        comment_id: &str,
        emoji: &str,
    ) -> Result<JsonValue, String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/comments/{}/reactions",
            room_id, thread_id, comment_id
        );
        let body = serde_json::json!({ "emoji": emoji });
        let resp = self.post(&path, &body.to_string()).await?;
        parse_json_response(&resp.body)
    }

    /// Remove a reaction from a comment.
    pub async fn remove_reaction(
        &self,
        room_id: &str,
        thread_id: &str,
        comment_id: &str,
        emoji: &str,
    ) -> Result<(), String> {
        let path = format!(
            "/v2/c/rooms/{}/threads/{}/comments/{}/reactions/{}",
            room_id, thread_id, comment_id, emoji
        );
        let resp = self.delete(&path).await?;
        if resp.status >= 200 && resp.status < 300 {
            Ok(())
        } else {
            Err(format!("Remove reaction failed: {}", resp.status))
        }
    }

    // -- Search --

    /// Search comments in a room.
    pub async fn search_comments(
        &self,
        room_id: &str,
        text: Option<&str>,
        query: Option<&str>,
    ) -> Result<JsonValue, String> {
        let mut path = format!("/v2/c/rooms/{}/threads/comments/search", room_id);
        let mut params = Vec::new();
        if let Some(t) = text {
            params.push(format!("text={}", t));
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
}

fn parse_json_response(body: &str) -> Result<JsonValue, String> {
    serde_json::from_str(body).map_err(|e| format!("JSON parse error: {}", e))
}
