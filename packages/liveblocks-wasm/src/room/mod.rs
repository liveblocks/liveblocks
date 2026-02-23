//! Room: the top-level coordinator for a Liveblocks room connection.
//!
//! The Room composes the connection FSM, CRDT document, presence, outbound
//! buffer, and event system into a single cohesive unit.

pub mod buffer;
pub mod dispatch;
pub mod events;
pub mod presence;
pub mod storage;

use serde_json::Value as JsonValue;

use crate::connection::fsm::Status;
use crate::connection::managed_socket::{ManagedSocket, ManagedSocketEvent};
use crate::document::Document;
use crate::id_gen::IdGenerator;
use crate::ops::apply::apply_op;
use crate::platform::{HttpClient, WebSocketConnector};
use crate::protocol::client_msg::{ClientMsg, serialize_client_msgs};
use crate::protocol::server_msg::parse_server_messages;
use crate::room_engine::RoomStorageEngine;
use crate::types::{Op, OpSource};

use buffer::OutboundBuffer;
use events::EventHub;
use presence::PresenceManager;

/// Dynamic session info received from ROOM_STATE.
#[derive(Debug, Clone)]
pub struct DynamicSessionInfo {
    pub actor: i32,
    pub nonce: String,
    pub scopes: Vec<String>,
}

/// Storage status.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StorageStatus {
    NotLoaded,
    Loading,
    Loaded,
    Synchronized,
}

/// The Room struct.
pub struct Room<C: WebSocketConnector, H: HttpClient> {
    // Connection
    pub(crate) managed_socket: ManagedSocket<C, H>,

    // CRDT state
    pub(crate) document: Document,
    pub(crate) id_gen: IdGenerator,
    pub(crate) storage_engine: RoomStorageEngine,

    // Presence
    pub(crate) presence: PresenceManager,

    // Outbound buffer
    pub(crate) buffer: OutboundBuffer,

    // Event system
    pub(crate) events: EventHub,

    // Session state
    pub(crate) storage_status: StorageStatus,
    pub(crate) session: Option<DynamicSessionInfo>,
    pub(crate) room_id: String,

    // Configuration
    pub(crate) throttle_delay: u64,
    pub(crate) lost_connection_timeout: u64,
}

impl<C: WebSocketConnector, H: HttpClient> Room<C, H> {
    pub fn new(
        managed_socket: ManagedSocket<C, H>,
        room_id: String,
        initial_presence: JsonValue,
        throttle_delay: u64,
        lost_connection_timeout: u64,
    ) -> Self {
        Self {
            managed_socket,
            document: Document::new(),
            id_gen: IdGenerator::default(),
            storage_engine: RoomStorageEngine::new(),
            presence: PresenceManager::new(initial_presence),
            buffer: OutboundBuffer::new(),
            events: EventHub::new(),
            storage_status: StorageStatus::NotLoaded,
            session: None,
            room_id,
            throttle_delay,
            lost_connection_timeout,
        }
    }

    /// Get the current connection status.
    pub fn status(&self) -> Status {
        self.managed_socket.status()
    }

    /// Get the current storage status.
    pub fn storage_status(&self) -> StorageStatus {
        self.storage_status
    }

    /// Get the room ID.
    pub fn room_id(&self) -> &str {
        &self.room_id
    }

    /// Get the actor ID, if connected.
    pub fn actor_id(&self) -> Option<i32> {
        self.session.as_ref().map(|s| s.actor)
    }

    /// Get a reference to the document.
    pub fn document(&self) -> &Document {
        &self.document
    }

    /// Get a mutable reference to the document.
    pub fn document_mut(&mut self) -> &mut Document {
        &mut self.document
    }

    /// Get a reference to the storage engine.
    pub fn storage_engine(&self) -> &RoomStorageEngine {
        &self.storage_engine
    }

    /// Get a mutable reference to the storage engine.
    pub fn storage_engine_mut(&mut self) -> &mut RoomStorageEngine {
        &mut self.storage_engine
    }

    /// Get a reference to the id generator.
    pub fn id_gen(&self) -> &IdGenerator {
        &self.id_gen
    }

    /// Get a mutable reference to the id generator.
    pub fn id_gen_mut(&mut self) -> &mut IdGenerator {
        &mut self.id_gen
    }

    /// Get a reference to the presence manager.
    pub fn presence(&self) -> &PresenceManager {
        &self.presence
    }

    /// Get a reference to the event hub.
    pub fn events(&self) -> &EventHub {
        &self.events
    }

    /// Drain all pending events from the event hub.
    pub fn take_events(&mut self) -> Vec<events::RoomEvent> {
        self.events.take_events()
    }

    // -- Connection --

    /// Poll for the next incoming WebSocket event and feed it to the
    /// connection FSM. Returns `true` if an event was processed.
    pub async fn poll_ws_event(&mut self) -> bool {
        self.managed_socket.poll_ws_event().await
    }

    /// Connect to the room.
    pub async fn connect(&mut self) {
        self.managed_socket.connect().await;
    }

    /// Disconnect from the room.
    pub async fn disconnect(&mut self) {
        self.managed_socket.disconnect().await;
    }

    /// Reconnect to the room.
    pub async fn reconnect(&mut self) {
        self.managed_socket.reconnect().await;
    }

    // -- Storage --

    /// Request storage from the server (sends FETCH_STORAGE).
    pub fn fetch_storage(&mut self) {
        if self.storage_status != StorageStatus::NotLoaded {
            return;
        }
        self.storage_status = StorageStatus::Loading;
        self.buffer.push(ClientMsg::FetchStorage {});
    }

    // -- Outbound --

    /// Queue an outbound presence update.
    pub fn update_presence(&mut self, patch: JsonValue) {
        self.presence.update_my_presence(patch.clone());

        if self.session.is_some() {
            self.buffer.push(ClientMsg::UpdatePresence {
                target_actor: None,
                data: patch,
            });
        }

        self.events.notify_my_presence(self.presence.my_presence());
    }

    /// Queue an outbound broadcast event.
    pub fn broadcast_event(&mut self, event: JsonValue) {
        self.buffer.push(ClientMsg::BroadcastEvent { event });
    }

    // -- Yjs --

    /// Request Yjs document from the server (sends FETCH_YDOC).
    pub fn fetch_ydoc(&mut self, vector: String, guid: Option<String>, v2: Option<bool>) {
        self.buffer
            .push(ClientMsg::FetchYdoc { vector, guid, v2 });
    }

    /// Send a Yjs document update to the server (sends UPDATE_YDOC).
    pub fn update_ydoc(&mut self, update: String, guid: Option<String>, v2: Option<bool>) {
        self.buffer
            .push(ClientMsg::UpdateYdoc { update, guid, v2 });
    }

    /// Flush the outbound buffer over the WebSocket.
    pub fn flush(&mut self) {
        if self.buffer.is_empty() {
            return;
        }

        let msgs = self.buffer.drain();
        if let Ok(serialized) = serialize_client_msgs(&msgs) {
            let _ = self.managed_socket.send(&serialized);
        }
    }

    // -- Server message dispatch --

    /// Process incoming managed socket events.
    pub fn process_socket_events(&mut self) {
        let events = self.managed_socket.take_events();
        for event in events {
            match event {
                ManagedSocketEvent::StatusDidChange(status) => {
                    self.events.notify_status(status);
                }
                ManagedSocketEvent::Message(text) => {
                    self.handle_server_messages(&text);
                }
                ManagedSocketEvent::Connected => {
                    self.on_connected();
                }
                ManagedSocketEvent::Disconnected => {
                    self.on_disconnected();
                }
                ManagedSocketEvent::ConnectionError { message, code } => {
                    self.events.notify_error(&message, code);
                }
            }
        }
    }

    /// Handle incoming server messages (single text frame, may be array).
    fn handle_server_messages(&mut self, text: &str) {
        match parse_server_messages(text) {
            Ok(msgs) => {
                for msg in msgs {
                    dispatch::dispatch_server_msg(self, msg);
                }
            }
            Err(_e) => {
                #[cfg(debug_assertions)]
                eprintln!("Failed to parse server message: {_e}");
            }
        }
    }

    /// Called when the socket connects.
    fn on_connected(&mut self) {
        // Send full presence on connect
        if self.session.is_some() {
            self.buffer.push(ClientMsg::UpdatePresence {
                target_actor: Some(-1), // broadcast to all
                data: self.presence.my_presence().clone(),
            });
        }
    }

    /// Called when the socket disconnects.
    fn on_disconnected(&mut self) {
        self.session = None;
        self.presence.clear_others();
        self.events.notify_others_change(&[]);
    }

    // -- History --

    /// Undo the last local operation.
    pub fn undo(&mut self) {
        if let Some(frames) = self.storage_engine.undo() {
            // Extract ops from stackframes and apply them
            let ops = Self::extract_ops_from_frames(&frames);
            self.apply_local_ops(ops);
        }
    }

    /// Redo the last undone operation.
    pub fn redo(&mut self) {
        if let Some(frames) = self.storage_engine.redo() {
            let ops = Self::extract_ops_from_frames(&frames);
            self.apply_local_ops(ops);
        }
    }

    /// Can undo?
    pub fn can_undo(&self) -> bool {
        self.storage_engine.can_undo()
    }

    /// Can redo?
    pub fn can_redo(&self) -> bool {
        self.storage_engine.can_redo()
    }

    /// Pause history.
    pub fn pause_history(&mut self) {
        self.storage_engine.pause_history();
    }

    /// Resume history.
    pub fn resume_history(&mut self) {
        self.storage_engine.resume_history();
    }

    // -- Batch --

    /// Execute a batch of mutations.
    pub fn batch<F>(&mut self, f: F)
    where
        F: FnOnce(&mut Self),
    {
        self.storage_engine.start_batch();
        f(self);
        if let Some((_ops, _reverse)) = self.storage_engine.end_batch() {
            // Ops were already applied during the batch via individual mutations
        }
        self.events
            .notify_history_change(self.can_undo(), self.can_redo());
    }

    // -- Internal helpers --

    /// Extract Op items from stackframes (skipping presence frames).
    fn extract_ops_from_frames(
        frames: &[crate::room_engine::Stackframe],
    ) -> Vec<Op> {
        frames
            .iter()
            .filter_map(|f| {
                if let crate::room_engine::Stackframe::StorageOp(op) = f {
                    Some(op.clone())
                } else {
                    None
                }
            })
            .collect()
    }

    /// Apply local ops to the document and queue them for sending.
    fn apply_local_ops(&mut self, ops: Vec<Op>) {
        for op in &ops {
            apply_op(&mut self.document, op, OpSource::Local);
        }

        if !ops.is_empty() {
            self.buffer.push(ClientMsg::UpdateStorage { ops: ops.clone() });

            // Track as unacked for reconnection replay
            for op in &ops {
                if let Some(op_id) = &op.op_id {
                    self.storage_engine
                        .track_unacked_op(op_id.clone(), op.clone());
                }
            }
        }

        self.events.notify_storage_change();
        self.events
            .notify_history_change(self.can_undo(), self.can_redo());
    }
}
