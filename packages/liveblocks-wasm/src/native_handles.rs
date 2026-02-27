//! JS-like handle API for native Rust clients.
//!
//! Provides `LiveRoom`, `LiveObject`, `LiveList`, and `LiveMap` types that
//! mirror the JavaScript Liveblocks SDK's object-oriented API.
//!
//! # Design
//!
//! All handles share interior-mutable access to a single `NativeRoom` via
//! `Rc<RefCell<NativeRoom>>`. Each method call briefly borrows the room,
//! performs the operation, and releases the borrow.
//!
//! # Example
//!
//! ```no_run
//! use liveblocks_wasm::native_api::{LiveRoom, RoomBuilder};
//!
//! # async fn example() {
//! let room = RoomBuilder::new("my-room")
//!     .public_key("pk_test_xxx")
//!     .build();
//! let live = LiveRoom::new(room);
//! live.connect().await;
//!
//! // ... after storage is loaded ...
//! let root = live.root().unwrap();
//! root.set("name", "Alice");
//! # }
//! ```

use std::cell::RefCell;
use std::collections::BTreeMap;
use std::rc::Rc;

use serde_json::Value as JsonValue;

use crate::connection::fsm::Status;
use crate::native_api::NativeRoom;
use crate::room::events::RoomEvent;
use crate::room::StorageStatus;
use crate::types::{CrdtType, Json};

/// Shared room reference used by all handles.
type SharedRoom = Rc<RefCell<NativeRoom>>;

/// A handle to a Liveblocks room, providing a JS-like API.
///
/// Created from a `NativeRoom` (built via `RoomBuilder`). Handles
/// (`LiveObject`, `LiveList`, `LiveMap`) obtained from this room share
/// interior-mutable access via `Rc<RefCell<NativeRoom>>`.
pub struct LiveRoom(SharedRoom);

impl LiveRoom {
    /// Wrap a `NativeRoom` in a `LiveRoom` handle.
    pub fn new(room: NativeRoom) -> Self {
        Self(Rc::new(RefCell::new(room)))
    }

    // -- Connection --

    /// Connect to the room.
    pub async fn connect(&self) {
        self.0.borrow_mut().connect().await;
    }

    /// Disconnect from the room.
    pub async fn disconnect(&self) {
        self.0.borrow_mut().disconnect().await;
    }

    /// Poll for the next incoming WebSocket event. Returns `false` when the
    /// socket is closed.
    pub async fn poll_ws_event(&self) -> bool {
        self.0.borrow_mut().poll_ws_event().await
    }

    // -- Sync --

    /// Process incoming socket events through the room state machine.
    pub fn process_socket_events(&self) {
        self.0.borrow_mut().process_socket_events();
    }

    /// Request storage from the server (sends FETCH_STORAGE).
    pub fn fetch_storage(&self) {
        self.0.borrow_mut().fetch_storage();
    }

    /// Flush any queued outbound messages over the WebSocket.
    pub fn flush(&self) {
        self.0.borrow_mut().flush();
    }

    // -- Status --

    /// Get the current connection status.
    pub fn status(&self) -> Status {
        self.0.borrow().status()
    }

    /// Get the current storage status.
    pub fn storage_status(&self) -> StorageStatus {
        self.0.borrow().storage_status()
    }

    /// Get the room ID.
    pub fn room_id(&self) -> String {
        self.0.borrow().room_id().to_string()
    }

    // -- Events --

    /// Drain all pending events from the event hub.
    pub fn take_events(&self) -> Vec<RoomEvent> {
        self.0.borrow_mut().take_events()
    }

    // -- History --

    /// Undo the last local operation.
    pub fn undo(&self) {
        self.0.borrow_mut().undo();
    }

    /// Redo the last undone operation.
    pub fn redo(&self) {
        self.0.borrow_mut().redo();
    }

    /// Can undo?
    pub fn can_undo(&self) -> bool {
        self.0.borrow().can_undo()
    }

    /// Can redo?
    pub fn can_redo(&self) -> bool {
        self.0.borrow().can_redo()
    }

    /// Pause history accumulation.
    pub fn pause_history(&self) {
        self.0.borrow_mut().pause_history();
    }

    /// Resume history and commit paused frames as a single undo entry.
    pub fn resume_history(&self) {
        self.0.borrow_mut().resume_history();
    }

    /// Clear undo and redo stacks.
    pub fn clear_history(&self) {
        self.0.borrow_mut().clear_history();
    }

    // -- Batch --

    /// Execute a batch of mutations. All mutations performed inside the
    /// closure are grouped into a single undo entry.
    ///
    /// The closure receives no arguments — use handles obtained from `root()`
    /// to perform mutations.
    pub fn batch<F>(&self, f: F)
    where
        F: FnOnce(),
    {
        self.0.borrow_mut().storage_engine.start_batch();
        f();
        let mut room = self.0.borrow_mut();
        if let Some((_ops, reverse)) = room.storage_engine.end_batch() {
            if !reverse.is_empty() {
                room.storage_engine.add_to_undo_stack(reverse);
            }
        }
        let can_undo = room.can_undo();
        let can_redo = room.can_redo();
        room.events.notify_history_change(can_undo, can_redo);
    }

    // -- Presence --

    /// Queue an outbound presence update.
    pub fn update_presence(&self, patch: JsonValue) {
        self.0.borrow_mut().update_presence(patch);
    }

    /// Queue an outbound broadcast event.
    pub fn broadcast_event(&self, event: JsonValue) {
        self.0.borrow_mut().broadcast_event(event);
    }

    // -- Storage --

    /// Get a handle to the root `LiveObject`, if storage is loaded.
    pub fn root(&self) -> Option<LiveObject> {
        let room = self.0.borrow();
        let id = room.root_id()?;
        Some(LiveObject {
            room: self.0.clone(),
            node_id: id,
        })
    }

    /// Get the number of CRDT nodes in the document.
    pub fn document_len(&self) -> usize {
        self.0.borrow().document().len()
    }
}

// ============================================================
// LiveObject
// ============================================================

/// A handle to a `LiveObject` CRDT node.
///
/// Obtained from `LiveRoom::root()`, `LiveObject::get_object()`,
/// `LiveList` child navigation, or `LiveMap::get_object()`.
#[derive(Clone)]
pub struct LiveObject {
    room: SharedRoom,
    node_id: String,
}

impl LiveObject {
    /// Get the node ID of this LiveObject.
    pub fn node_id(&self) -> &str {
        &self.node_id
    }

    // -- Read --

    /// Get a scalar property value.
    pub fn get(&self, key: &str) -> Option<Json> {
        self.room.borrow().object_get(&self.node_id, key)
    }

    /// Get all property keys.
    pub fn keys(&self) -> Vec<String> {
        self.room.borrow().object_keys(&self.node_id)
    }

    /// Convert to an immutable JSON representation (recursive).
    pub fn to_immutable(&self) -> Option<Json> {
        self.room.borrow().object_to_immutable(&self.node_id)
    }

    // -- Write --

    /// Set a property on this LiveObject.
    pub fn set(&self, key: &str, value: impl Into<Json>) {
        self.room
            .borrow_mut()
            .object_set(&self.node_id, key, value.into());
    }

    /// Delete a property from this LiveObject.
    pub fn delete(&self, key: &str) {
        self.room.borrow_mut().object_delete(&self.node_id, key);
    }

    /// Update multiple properties at once.
    pub fn update(&self, data: BTreeMap<String, Json>) {
        self.room
            .borrow_mut()
            .object_update(&self.node_id, data);
    }

    // -- Navigate --

    /// Get a child LiveObject by key.
    pub fn get_object(&self, key: &str) -> Option<LiveObject> {
        let room = self.room.borrow();
        let child_id = room.object_get_child_id(&self.node_id, key)?;
        if room.get_node_type(&child_id) != Some(CrdtType::Object) {
            return None;
        }
        Some(LiveObject {
            room: self.room.clone(),
            node_id: child_id,
        })
    }

    /// Get a child LiveList by key.
    pub fn get_list(&self, key: &str) -> Option<LiveList> {
        let room = self.room.borrow();
        let child_id = room.object_get_child_id(&self.node_id, key)?;
        if room.get_node_type(&child_id) != Some(CrdtType::List) {
            return None;
        }
        Some(LiveList {
            room: self.room.clone(),
            node_id: child_id,
        })
    }

    /// Get a child LiveMap by key.
    pub fn get_map(&self, key: &str) -> Option<LiveMap> {
        let room = self.room.borrow();
        let child_id = room.object_get_child_id(&self.node_id, key)?;
        if room.get_node_type(&child_id) != Some(CrdtType::Map) {
            return None;
        }
        Some(LiveMap {
            room: self.room.clone(),
            node_id: child_id,
        })
    }
}

// ============================================================
// LiveList
// ============================================================

/// A handle to a `LiveList` CRDT node.
///
/// Obtained from `LiveObject::get_list()` or `LiveMap::get_list()`.
#[derive(Clone)]
pub struct LiveList {
    room: SharedRoom,
    node_id: String,
}

impl LiveList {
    /// Get the node ID of this LiveList.
    pub fn node_id(&self) -> &str {
        &self.node_id
    }

    // -- Read --

    /// Get the value at an index.
    pub fn get(&self, index: usize) -> Option<Json> {
        self.room.borrow().list_get(&self.node_id, index)
    }

    /// Get the number of items.
    pub fn length(&self) -> usize {
        self.room.borrow().list_length(&self.node_id)
    }

    /// Convert to an immutable JSON array (recursive).
    pub fn to_immutable(&self) -> Option<Json> {
        self.room.borrow().list_to_immutable(&self.node_id)
    }

    /// Get all values as a Vec.
    pub fn to_vec(&self) -> Vec<Json> {
        self.room.borrow().list_to_array(&self.node_id)
    }

    // -- Write --

    /// Push a value to the end.
    pub fn push(&self, value: impl Into<Json>) {
        self.room
            .borrow_mut()
            .list_push(&self.node_id, value.into());
    }

    /// Insert a value at an index.
    pub fn insert(&self, value: impl Into<Json>, index: usize) {
        self.room
            .borrow_mut()
            .list_insert(&self.node_id, value.into(), index);
    }

    /// Move an item from one index to another.
    pub fn move_item(&self, from: usize, to: usize) {
        self.room
            .borrow_mut()
            .list_move(&self.node_id, from, to);
    }

    /// Delete the item at an index.
    pub fn delete(&self, index: usize) {
        self.room.borrow_mut().list_delete(&self.node_id, index);
    }

    /// Replace the value at an index.
    pub fn set(&self, index: usize, value: impl Into<Json>) {
        self.room
            .borrow_mut()
            .list_set(&self.node_id, index, value.into());
    }

    /// Remove all items.
    pub fn clear(&self) {
        self.room.borrow_mut().list_clear(&self.node_id);
    }
}

// ============================================================
// LiveMap
// ============================================================

/// A handle to a `LiveMap` CRDT node.
///
/// Obtained from `LiveObject::get_map()` or `LiveMap::get_map()`.
#[derive(Clone)]
pub struct LiveMap {
    room: SharedRoom,
    node_id: String,
}

impl LiveMap {
    /// Get the node ID of this LiveMap.
    pub fn node_id(&self) -> &str {
        &self.node_id
    }

    // -- Read --

    /// Get a value by key.
    pub fn get(&self, key: &str) -> Option<Json> {
        self.room.borrow().map_get(&self.node_id, key)
    }

    /// Check if a key exists.
    pub fn has(&self, key: &str) -> bool {
        self.room.borrow().map_has(&self.node_id, key)
    }

    /// Get the number of entries.
    pub fn size(&self) -> usize {
        self.room.borrow().map_size(&self.node_id)
    }

    /// Get all keys.
    pub fn keys(&self) -> Vec<String> {
        self.room.borrow().map_keys(&self.node_id)
    }

    /// Get all entries as `(key, value)` pairs.
    pub fn entries(&self) -> Vec<(String, Json)> {
        self.room.borrow().map_entries(&self.node_id)
    }

    /// Convert to an immutable JSON representation (recursive).
    pub fn to_immutable(&self) -> Option<Json> {
        self.room.borrow().map_to_immutable(&self.node_id)
    }

    // -- Write --

    /// Set a value at a key.
    pub fn set(&self, key: &str, value: impl Into<Json>) {
        self.room
            .borrow_mut()
            .map_set(&self.node_id, key, value.into());
    }

    /// Delete a key. Returns `true` if the key existed.
    pub fn delete(&self, key: &str) -> bool {
        self.room.borrow_mut().map_delete(&self.node_id, key)
    }

    // -- Navigate --

    /// Get a child LiveObject by key.
    pub fn get_object(&self, key: &str) -> Option<LiveObject> {
        let room = self.room.borrow();
        let child_id = room.map_get_child_id(&self.node_id, key)?;
        if room.get_node_type(&child_id) != Some(CrdtType::Object) {
            return None;
        }
        Some(LiveObject {
            room: self.room.clone(),
            node_id: child_id,
        })
    }

    /// Get a child LiveList by key.
    pub fn get_list(&self, key: &str) -> Option<LiveList> {
        let room = self.room.borrow();
        let child_id = room.map_get_child_id(&self.node_id, key)?;
        if room.get_node_type(&child_id) != Some(CrdtType::List) {
            return None;
        }
        Some(LiveList {
            room: self.room.clone(),
            node_id: child_id,
        })
    }

    /// Get a child LiveMap by key.
    pub fn get_map(&self, key: &str) -> Option<LiveMap> {
        let room = self.room.borrow();
        let child_id = room.map_get_child_id(&self.node_id, key)?;
        if room.get_node_type(&child_id) != Some(CrdtType::Map) {
            return None;
        }
        Some(LiveMap {
            room: self.room.clone(),
            node_id: child_id,
        })
    }
}
