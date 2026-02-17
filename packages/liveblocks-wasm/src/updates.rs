use serde::Serialize;

use crate::types::Json;

/// Delta type for storage update notifications.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum UpdateDelta {
    /// A property/key was set to a new value.
    Set {
        old_value: Option<Json>,
        new_value: Json,
    },
    /// A property/key was deleted.
    Delete { old_value: Json },
}

/// Entry in a LiveList update notification.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ListUpdateEntry {
    Set {
        index: usize,
        old_value: Option<Json>,
        new_value: Json,
    },
    Delete {
        index: usize,
        old_value: Json,
    },
    Move {
        previous_index: usize,
        new_index: usize,
        value: Json,
    },
    Insert {
        index: usize,
        value: Json,
    },
}

/// Storage update notification types, produced when CRDT nodes are mutated.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum StorageUpdate {
    LiveObjectUpdate {
        node_id: String,
        updates: std::collections::HashMap<String, UpdateDelta>,
    },
    LiveListUpdate {
        node_id: String,
        updates: Vec<ListUpdateEntry>,
    },
    LiveMapUpdate {
        node_id: String,
        updates: std::collections::HashMap<String, UpdateDelta>,
    },
}
