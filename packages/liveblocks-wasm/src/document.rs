use std::collections::HashMap;

use crate::arena::{Arena, NodeKey};
use crate::crdt::node::{CrdtData, CrdtNode};

/// The CRDT document: an arena of nodes with ID→key mapping.
/// This is the main entry point for all CRDT operations.
pub struct Document {
    pub(crate) arena: Arena<CrdtNode>,
    pub(crate) id_to_key: HashMap<String, NodeKey>,
    pub(crate) root_key: Option<NodeKey>,
}

impl Document {
    pub fn new() -> Self {
        Self {
            arena: Arena::new(),
            id_to_key: HashMap::new(),
            root_key: None,
        }
    }

    /// Insert a node into the document, registering its ID mapping.
    pub fn insert_node(&mut self, node: CrdtNode) -> NodeKey {
        let id = node.id.clone();
        let key = self.arena.insert(node);
        self.id_to_key.insert(id, key);
        key
    }

    /// Insert a node and set it as the root.
    pub fn insert_root(&mut self, node: CrdtNode) -> NodeKey {
        let key = self.insert_node(node);
        self.root_key = Some(key);
        key
    }

    /// Get a node by its arena key.
    pub fn get_node(&self, key: NodeKey) -> Option<&CrdtNode> {
        self.arena.get(key)
    }

    /// Get a mutable reference to a node by its arena key.
    pub fn get_node_mut(&mut self, key: NodeKey) -> Option<&mut CrdtNode> {
        self.arena.get_mut(key)
    }

    /// Look up a node by its string ID (e.g., "1:0", "root").
    pub fn get_key_by_id(&self, id: &str) -> Option<NodeKey> {
        self.id_to_key.get(id).copied()
    }

    /// Look up a node by its string ID.
    pub fn get_node_by_id(&self, id: &str) -> Option<&CrdtNode> {
        self.get_key_by_id(id).and_then(|key| self.arena.get(key))
    }

    /// Remove a node from the document.
    pub fn remove_node(&mut self, key: NodeKey) -> Option<CrdtNode> {
        let node = self.arena.remove(key)?;
        self.id_to_key.remove(&node.id);
        if self.root_key == Some(key) {
            self.root_key = None;
        }
        Some(node)
    }

    /// Remove a node and all its descendants from the document.
    pub fn remove_node_recursive(&mut self, key: NodeKey) {
        // Collect child keys first to avoid borrow issues
        let child_keys: Vec<NodeKey> = {
            let Some(node) = self.arena.get(key) else {
                return;
            };
            match &node.data {
                CrdtData::Object { children, .. } => children.values().copied().collect(),
                CrdtData::List { children, .. } => children.iter().map(|(_, ck)| *ck).collect(),
                CrdtData::Map { children, .. } => children.values().copied().collect(),
                CrdtData::Register { .. } => vec![],
            }
        };

        for ck in child_keys {
            self.remove_node_recursive(ck);
        }

        self.remove_node(key);
    }

    /// Get the root node key.
    pub fn root_key(&self) -> Option<NodeKey> {
        self.root_key
    }

    /// Get the root node.
    pub fn root(&self) -> Option<&CrdtNode> {
        self.root_key.and_then(|k| self.arena.get(k))
    }

    /// Number of nodes in the document.
    pub fn len(&self) -> usize {
        self.arena.len()
    }

    /// Check if the document has no nodes.
    pub fn is_empty(&self) -> bool {
        self.arena.is_empty()
    }

    /// Get all node IDs in the document.
    pub fn all_node_ids(&self) -> Vec<String> {
        self.id_to_key.keys().cloned().collect()
    }
}

impl Default for Document {
    fn default() -> Self {
        Self::new()
    }
}
