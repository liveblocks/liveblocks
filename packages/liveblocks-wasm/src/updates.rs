use serde::Serialize;

use crate::types::Json;

/// Delta type for storage update notifications.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum UpdateDelta {
    /// A property/key was set to a new value.
    Set {
        #[serde(rename = "oldValue")]
        old_value: Option<Json>,
        #[serde(rename = "newValue")]
        new_value: Json,
    },
    /// A property/key was deleted.
    Delete {
        #[serde(rename = "oldValue")]
        old_value: Json,
        /// The node ID of the deleted child (if it was a CRDT node).
        /// Used by JS to look up the actual LiveNode wrapper.
        #[serde(rename = "deletedId", skip_serializing_if = "Option::is_none")]
        deleted_id: Option<String>,
    },
}

/// Entry in a LiveList update notification.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ListUpdateEntry {
    Set {
        index: usize,
        #[serde(rename = "oldValue")]
        old_value: Option<Json>,
        #[serde(rename = "newValue")]
        new_value: Json,
    },
    Delete {
        index: usize,
        #[serde(rename = "oldValue")]
        old_value: Json,
    },
    Move {
        #[serde(rename = "previousIndex")]
        previous_index: usize,
        #[serde(rename = "newIndex")]
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
        #[serde(rename = "nodeId")]
        node_id: String,
        updates: std::collections::HashMap<String, UpdateDelta>,
    },
    LiveListUpdate {
        #[serde(rename = "nodeId")]
        node_id: String,
        updates: Vec<ListUpdateEntry>,
    },
    LiveMapUpdate {
        #[serde(rename = "nodeId")]
        node_id: String,
        updates: std::collections::HashMap<String, UpdateDelta>,
    },
}
