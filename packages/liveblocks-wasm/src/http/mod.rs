//! HTTP API client for Liveblocks REST endpoints.
//!
//! Covers threads, comments, reactions, inbox notifications, and related
//! endpoints. All requests go through the `HttpClient` platform trait
//! with an auth Bearer token injected.

pub mod comments;
pub mod notifications;

use crate::platform::{HttpClient, HttpMethod, HttpRequest, HttpResponse};

/// An authenticated HTTP client wrapper that injects the auth token.
pub struct ApiClient<H: HttpClient> {
    http: H,
    base_url: String,
    /// Current auth token (Bearer token string).
    token: Option<String>,
    /// Client version string for X-LB-Client header.
    client_version: String,
}

impl<H: HttpClient> ApiClient<H> {
    pub fn new(http: H, base_url: String) -> Self {
        Self {
            http,
            base_url,
            token: None,
            client_version: "rust-wasm/0.1.0".to_string(),
        }
    }

    /// Set the current auth token.
    pub fn set_token(&mut self, token: String) {
        self.token = Some(token);
    }

    /// Clear the current auth token.
    pub fn clear_token(&mut self) {
        self.token = None;
    }

    /// Build a full URL from a path (e.g. `/v2/c/rooms/{roomId}/threads`).
    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    /// Build common headers with auth.
    fn headers(&self) -> Vec<(String, String)> {
        let mut headers = vec![
            (
                "Content-Type".to_string(),
                "application/json; charset=utf-8".to_string(),
            ),
            ("X-LB-Client".to_string(), self.client_version.clone()),
        ];

        if let Some(token) = &self.token {
            headers.push(("Authorization".to_string(), format!("Bearer {}", token)));
        }

        headers
    }

    /// Perform a GET request.
    pub async fn get(&self, path: &str) -> Result<HttpResponse, String> {
        let req = HttpRequest {
            method: HttpMethod::Get,
            url: self.url(path),
            headers: self.headers(),
            body: None,
        };
        self.http.request(req).await
    }

    /// Perform a POST request with a JSON body.
    pub async fn post(&self, path: &str, body: &str) -> Result<HttpResponse, String> {
        let req = HttpRequest {
            method: HttpMethod::Post,
            url: self.url(path),
            headers: self.headers(),
            body: Some(body.to_string()),
        };
        self.http.request(req).await
    }

    /// Perform a DELETE request.
    pub async fn delete(&self, path: &str) -> Result<HttpResponse, String> {
        let req = HttpRequest {
            method: HttpMethod::Delete,
            url: self.url(path),
            headers: self.headers(),
            body: None,
        };
        self.http.request(req).await
    }

    /// Perform a PUT request with a body.
    pub async fn put(&self, path: &str, body: &str) -> Result<HttpResponse, String> {
        let req = HttpRequest {
            method: HttpMethod::Put,
            url: self.url(path),
            headers: self.headers(),
            body: Some(body.to_string()),
        };
        self.http.request(req).await
    }
}
