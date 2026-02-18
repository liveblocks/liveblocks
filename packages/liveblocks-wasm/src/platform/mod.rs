//! Platform abstraction traits.
//!
//! The core Room and connection FSM are platform-agnostic. These traits
//! define the capabilities that platform adapters must provide:
//! - WebSocket connectivity
//! - HTTP requests (for auth and REST APIs)
//! - Timers / scheduling
//!
//! Future return types are `+ 'a` but NOT `+ Send` because WASM futures
//! (JsFuture, etc.) are not Send. The Room runs in a single task/thread
//! regardless of platform, so Send on futures is not needed.

#[cfg(feature = "native")]
pub mod native;
#[cfg(feature = "wasm")]
pub mod wasm_platform;

use std::future::Future;
use std::pin::Pin;

/// Events received from a WebSocket connection.
#[derive(Debug, Clone)]
pub enum WsEvent {
    /// The connection was successfully opened.
    Open,
    /// A text message was received.
    Message(String),
    /// The connection was closed.
    Close { code: u16, reason: String },
    /// An error occurred.
    Error(String),
}

/// A handle to an open WebSocket connection.
///
/// The socket is send-only from the Room's perspective. Incoming events
/// are delivered through the `WsEventReceiver` channel.
pub trait WebSocket: Send {
    /// Send a text frame.
    fn send_text(&mut self, data: &str) -> Result<(), String>;
    /// Gracefully close the connection.
    fn close(&mut self) -> Result<(), String>;
}

/// Receiver for WebSocket events.
///
/// Platform adapters produce a `WsEventReceiver` alongside each socket.
/// The managed socket loop reads from this to feed events into the FSM.
pub trait WsEventReceiver: Send {
    /// Wait for the next event. Returns `None` when the channel is closed.
    fn recv(&mut self) -> Pin<Box<dyn Future<Output = Option<WsEvent>> + '_>>;
}

/// Factory for creating WebSocket connections.
pub trait WebSocketConnector: Send + Sync {
    type Socket: WebSocket;
    type Receiver: WsEventReceiver;

    /// Connect to the given URL. Returns the socket handle and an event receiver.
    fn connect(
        &self,
        url: &str,
    ) -> Pin<Box<dyn Future<Output = Result<(Self::Socket, Self::Receiver), String>> + '_>>;
}

/// A simple HTTP request.
#[derive(Debug, Clone)]
pub struct HttpRequest {
    pub method: HttpMethod,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
}

/// HTTP methods we use.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
}

/// A simple HTTP response.
#[derive(Debug, Clone)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
}

/// HTTP client for REST API calls (auth, comments, notifications).
pub trait HttpClient: Send + Sync {
    fn request(
        &self,
        req: HttpRequest,
    ) -> Pin<Box<dyn Future<Output = Result<HttpResponse, String>> + '_>>;
}

/// Timer / scheduling abstraction.
pub trait Timer: Send + Sync {
    /// Schedule a one-shot timer that fires after `delay_ms` milliseconds.
    /// Returns a future that resolves when the timer fires.
    fn delay(&self, delay_ms: u64) -> Pin<Box<dyn Future<Output = ()> + '_>>;
}
