//! Event system for the Room.
//!
//! The EventHub collects notifications that are emitted during Room processing.
//! These are consumed by the platform layer (native: broadcast channels,
//! WASM: JS callbacks).

use crate::connection::fsm::Status;
use crate::types::OpSource;
use crate::updates::StorageUpdate;
use serde_json::Value as JsonValue;

/// An event emitted by the Room.
#[derive(Debug, Clone)]
pub enum RoomEvent {
    /// Connection status changed.
    StatusChanged(Status),
    /// My presence changed.
    MyPresenceChanged(JsonValue),
    /// Others list changed.
    OthersChanged(JsonValue),
    /// Storage changed (batch of ops applied).
    /// Contains detailed updates describing what changed (may be empty for local mutations).
    /// `source` indicates whether this was a local optimistic update or a remote/server change.
    StorageChanged { updates: Vec<StorageUpdate>, source: OpSource },
    /// Storage loaded for the first time.
    StorageLoaded,
    /// Storage status changed.
    StorageStatusChanged(String),
    /// Custom broadcast event received from another client.
    CustomEvent {
        connection_id: i32,
        event: JsonValue,
    },
    /// History state changed (canUndo/canRedo).
    HistoryChanged { can_undo: bool, can_redo: bool },
    /// An error occurred.
    Error { message: String, code: i32 },
    /// Lost connection event.
    LostConnection(String),
    /// Yjs document update received from the server.
    YdocUpdate {
        update: String,
        is_sync: bool,
        state_vector: Option<String>,
        guid: Option<String>,
        v2: Option<bool>,
        remote_snapshot_hash: String,
    },
}

/// EventHub collects events during a processing cycle.
///
/// For native, these would be forwarded to broadcast channels.
/// For WASM, these would trigger JS callbacks.
#[derive(Debug, Default)]
pub struct EventHub {
    pending: Vec<RoomEvent>,
}

impl EventHub {
    pub fn new() -> Self {
        Self::default()
    }

    /// Take all pending events.
    pub fn take_events(&mut self) -> Vec<RoomEvent> {
        std::mem::take(&mut self.pending)
    }

    /// Check whether any pending event matches a predicate (without consuming).
    pub fn has_pending<F: Fn(&RoomEvent) -> bool>(&self, predicate: F) -> bool {
        self.pending.iter().any(predicate)
    }

    /// Notify: connection status changed.
    pub fn notify_status(&mut self, status: Status) {
        self.pending.push(RoomEvent::StatusChanged(status));
    }

    /// Notify: my presence changed.
    pub fn notify_my_presence(&mut self, presence: &JsonValue) {
        self.pending
            .push(RoomEvent::MyPresenceChanged(presence.clone()));
    }

    /// Notify: others list changed.
    pub fn notify_others_change(&mut self, others: &[JsonValue]) {
        self.pending
            .push(RoomEvent::OthersChanged(JsonValue::Array(others.to_vec())));
    }

    /// Notify: storage changed with detailed updates.
    pub fn notify_storage_change_with_updates(&mut self, updates: Vec<StorageUpdate>, source: OpSource) {
        self.pending.push(RoomEvent::StorageChanged { updates, source });
    }

    /// Notify: storage changed (no detailed updates).
    pub fn notify_storage_change(&mut self, source: OpSource) {
        self.pending.push(RoomEvent::StorageChanged { updates: Vec::new(), source });
    }

    /// Notify: storage loaded.
    pub fn notify_storage_loaded(&mut self) {
        self.pending.push(RoomEvent::StorageLoaded);
    }

    /// Notify: storage status changed.
    pub fn notify_storage_status(&mut self, status: &str) {
        self.pending
            .push(RoomEvent::StorageStatusChanged(status.to_string()));
    }

    /// Notify: custom broadcast event received.
    pub fn notify_custom_event(&mut self, connection_id: i32, event: JsonValue) {
        self.pending.push(RoomEvent::CustomEvent {
            connection_id,
            event,
        });
    }

    /// Notify: history state changed.
    pub fn notify_history_change(&mut self, can_undo: bool, can_redo: bool) {
        self.pending.push(RoomEvent::HistoryChanged {
            can_undo,
            can_redo,
        });
    }

    /// Notify: error.
    pub fn notify_error(&mut self, message: &str, code: i32) {
        self.pending.push(RoomEvent::Error {
            message: message.to_string(),
            code,
        });
    }

    /// Notify: lost connection.
    pub fn notify_lost_connection(&mut self, event: &str) {
        self.pending
            .push(RoomEvent::LostConnection(event.to_string()));
    }

    /// Notify: Yjs document update received.
    pub fn notify_ydoc_update(
        &mut self,
        update: String,
        is_sync: bool,
        state_vector: Option<String>,
        guid: Option<String>,
        v2: Option<bool>,
        remote_snapshot_hash: String,
    ) {
        self.pending.push(RoomEvent::YdocUpdate {
            update,
            is_sync,
            state_vector,
            guid,
            v2,
            remote_snapshot_hash,
        });
    }
}
