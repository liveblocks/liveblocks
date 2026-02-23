//! Public native Rust API for Liveblocks.
//!
//! This module provides an ergonomic builder for constructing a `Room` that
//! uses the native platform adapters (tokio-tungstenite, reqwest).
//!
//! # Example
//!
//! ```no_run
//! use liveblocks_wasm::native_api::{NativeRoom, RoomBuilder};
//!
//! #[tokio::main]
//! async fn main() {
//!     let mut room = RoomBuilder::new("my-room")
//!         .public_key("pk_test_xxx")
//!         .build();
//!
//!     room.connect().await;
//! }
//! ```

use serde_json::Value as JsonValue;

use crate::connection::managed_socket::{AuthEndpoint, Delegates, ManagedSocket};
use crate::platform::native::{NativeHttpClient, NativeWebSocketConnector, TokioTimer};
use crate::room::Room;

// Re-export types that native consumers need.
pub use crate::connection::fsm::Status;
pub use crate::connection::managed_socket::AuthEndpoint as Auth;
pub use crate::document::Document;
pub use crate::room::events::RoomEvent;
pub use crate::room::{DynamicSessionInfo, StorageStatus};
pub use crate::types::{Op, OpSource};

/// A `Room` wired to the native (tokio) platform adapters.
pub type NativeRoom = Room<NativeWebSocketConnector, NativeHttpClient>;

const DEFAULT_BASE_URL: &str = "https://api.liveblocks.io";
const DEFAULT_THROTTLE_DELAY_MS: u64 = 100;
const DEFAULT_LOST_CONNECTION_TIMEOUT_MS: u64 = 5000;

/// Builder for constructing a [`NativeRoom`].
///
/// At least one of [`public_key`](RoomBuilder::public_key) or
/// [`auth_endpoint`](RoomBuilder::auth_endpoint) must be called before
/// [`build`](RoomBuilder::build).
pub struct RoomBuilder {
    room_id: String,
    auth: Option<AuthEndpoint>,
    base_url: String,
    initial_presence: JsonValue,
    throttle_delay_ms: u64,
    lost_connection_timeout_ms: u64,
}

impl RoomBuilder {
    /// Create a new builder for the given room ID.
    pub fn new(room_id: impl Into<String>) -> Self {
        Self {
            room_id: room_id.into(),
            auth: None,
            base_url: DEFAULT_BASE_URL.to_string(),
            initial_presence: JsonValue::Object(Default::default()),
            throttle_delay_ms: DEFAULT_THROTTLE_DELAY_MS,
            lost_connection_timeout_ms: DEFAULT_LOST_CONNECTION_TIMEOUT_MS,
        }
    }

    /// Authenticate with a public API key.
    pub fn public_key(mut self, key: impl Into<String>) -> Self {
        self.auth = Some(AuthEndpoint::PublicKey(key.into()));
        self
    }

    /// Authenticate by POSTing to a private auth endpoint.
    pub fn auth_endpoint(mut self, url: impl Into<String>) -> Self {
        self.auth = Some(AuthEndpoint::PrivateEndpoint { url: url.into() });
        self
    }

    /// Override the base URL (default: `https://api.liveblocks.io`).
    pub fn base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    /// Set the initial presence (default: empty object `{}`).
    pub fn initial_presence(mut self, presence: JsonValue) -> Self {
        self.initial_presence = presence;
        self
    }

    /// Set the outbound flush throttle delay in milliseconds (default: 100).
    pub fn throttle_delay_ms(mut self, ms: u64) -> Self {
        self.throttle_delay_ms = ms;
        self
    }

    /// Set the lost-connection timeout in milliseconds (default: 5000).
    pub fn lost_connection_timeout_ms(mut self, ms: u64) -> Self {
        self.lost_connection_timeout_ms = ms;
        self
    }

    /// Build the [`NativeRoom`].
    ///
    /// # Panics
    ///
    /// Panics if neither `public_key` nor `auth_endpoint` was set.
    pub fn build(self) -> NativeRoom {
        let auth_endpoint = self
            .auth
            .expect("RoomBuilder requires either public_key() or auth_endpoint()");

        let delegates = Delegates {
            connector: NativeWebSocketConnector,
            http_client: NativeHttpClient::new(),
            timer: Box::new(TokioTimer),
            auth_endpoint,
        };

        let managed_socket =
            ManagedSocket::new(delegates, self.room_id.clone(), self.base_url);

        Room::new(
            managed_socket,
            self.room_id,
            self.initial_presence,
            self.throttle_delay_ms,
            self.lost_connection_timeout_ms,
        )
    }
}
