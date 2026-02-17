use std::collections::HashMap;

use crate::arena::NodeKey;
use crate::types::{CrdtType, Json};

/// The inner data for each CRDT node type.
#[derive(Debug, Clone)]
pub enum CrdtData {
    /// LiveObject: key-value store with LWW per-key conflict resolution.
    Object {
        /// Property key -> child node key in arena.
        children: HashMap<String, NodeKey>,
        /// Tracks unacknowledged ops: property key -> opId.
        unacked_ops: HashMap<String, String>,
    },
    /// LiveList: ordered collection with fractional position indexing.
    List {
        /// Child node keys sorted by position.
        children: Vec<(String, NodeKey)>,
        /// Tracks items that were implicitly deleted during conflict resolution.
        implicitly_deleted: HashMap<NodeKey, String>,
        /// Tracks unacknowledged sets: position -> opId.
        unacked_ops: HashMap<String, String>,
    },
    /// LiveMap: string-keyed map with LWW per-key conflict resolution.
    Map {
        /// Key -> child node key in arena.
        children: HashMap<String, NodeKey>,
        /// Tracks unacknowledged ops: key -> opId.
        unacked_ops: HashMap<String, String>,
    },
    /// LiveRegister: plain JSON value wrapper (internal/leaf node).
    Register { data: Json },
}

/// A node in the CRDT tree, stored in the generational arena.
#[derive(Debug, Clone)]
pub struct CrdtNode {
    /// Unique ID in format "{connectionId}:{counter}".
    pub id: String,
    /// The type of this node.
    pub node_type: CrdtType,
    /// Parent node ID (None for root).
    pub parent_id: Option<String>,
    /// Key or position within parent.
    pub parent_key: Option<String>,
    /// Type-specific data.
    pub data: CrdtData,
}

impl CrdtNode {
    pub fn new_object(id: String) -> Self {
        Self {
            id,
            node_type: CrdtType::Object,
            parent_id: None,
            parent_key: None,
            data: CrdtData::Object {
                children: HashMap::new(),
                unacked_ops: HashMap::new(),
            },
        }
    }

    pub fn new_list(id: String) -> Self {
        Self {
            id,
            node_type: CrdtType::List,
            parent_id: None,
            parent_key: None,
            data: CrdtData::List {
                children: Vec::new(),
                implicitly_deleted: HashMap::new(),
                unacked_ops: HashMap::new(),
            },
        }
    }

    pub fn new_map(id: String) -> Self {
        Self {
            id,
            node_type: CrdtType::Map,
            parent_id: None,
            parent_key: None,
            data: CrdtData::Map {
                children: HashMap::new(),
                unacked_ops: HashMap::new(),
            },
        }
    }

    pub fn new_register(id: String, data: Json) -> Self {
        Self {
            id,
            node_type: CrdtType::Register,
            parent_id: None,
            parent_key: None,
            data: CrdtData::Register { data },
        }
    }
}
