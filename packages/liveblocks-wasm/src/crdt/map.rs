use std::collections::BTreeMap;

use crate::arena::NodeKey;
use crate::crdt::node::{CrdtData, CrdtNode};
use crate::document::Document;
use crate::types::{Json, Op, OpCode};

/// Get a plain JSON value from a LiveMap by key.
/// Returns None if the key doesn't exist or the child is a CRDT node (not a register).
pub fn get(doc: &Document, key: NodeKey, map_key: &str) -> Option<Json> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Map { children, .. } => {
            let child_key = children.get(map_key)?;
            let child = doc.get_node(*child_key)?;
            match &child.data {
                CrdtData::Register { data } => Some(data.clone()),
                _ => None,
            }
        }
        _ => None,
    }
}

/// Get the NodeKey of a child node stored at a map key.
pub fn get_child(doc: &Document, key: NodeKey, map_key: &str) -> Option<NodeKey> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Map { children, .. } => children.get(map_key).copied(),
        _ => None,
    }
}

/// Check if a key exists in a LiveMap.
pub fn has(doc: &Document, key: NodeKey, map_key: &str) -> bool {
    let Some(node) = doc.get_node(key) else {
        return false;
    };
    match &node.data {
        CrdtData::Map { children, .. } => children.contains_key(map_key),
        _ => false,
    }
}

/// Get the number of entries in a LiveMap.
pub fn size(doc: &Document, key: NodeKey) -> usize {
    let Some(node) = doc.get_node(key) else {
        return 0;
    };
    match &node.data {
        CrdtData::Map { children, .. } => children.len(),
        _ => 0,
    }
}

/// Set a plain JSON value at a key in a LiveMap.
pub fn set(doc: &mut Document, key: NodeKey, map_key: &str, value: Json) {
    let Some(node) = doc.get_node(key) else {
        return;
    };
    if !matches!(&node.data, CrdtData::Map { .. }) {
        return;
    }

    // Remove old child if any
    remove_child_at_key(doc, key, map_key);

    let node_id = doc.get_node(key).map(|n| n.id.clone()).unwrap_or_default();
    let reg_id = format!("{}:{}", node_id, map_key);
    let mut reg_node = CrdtNode::new_register(reg_id, value);
    reg_node.parent_id = Some(node_id);
    reg_node.parent_key = Some(map_key.to_string());

    let reg_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Map { children, .. } = &mut node.data
    {
        children.insert(map_key.to_string(), reg_key);
    }
}

/// Set a child CRDT node at a key in a LiveMap.
pub fn set_child(doc: &mut Document, key: NodeKey, map_key: &str, child_key: NodeKey) {
    let Some(node) = doc.get_node(key) else {
        return;
    };
    if !matches!(&node.data, CrdtData::Map { .. }) {
        return;
    }

    // Set parent info on the child
    let parent_id = doc.get_node(key).map(|n| n.id.clone());
    if let Some(child) = doc.get_node_mut(child_key) {
        child.parent_id = parent_id;
        child.parent_key = Some(map_key.to_string());
    }

    // Remove old child if any
    remove_child_at_key(doc, key, map_key);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Map { children, .. } = &mut node.data
    {
        children.insert(map_key.to_string(), child_key);
    }
}

/// Delete a key from a LiveMap. Returns true if the key existed.
pub fn delete(doc: &mut Document, key: NodeKey, map_key: &str) -> bool {
    let child_key = {
        let Some(node) = doc.get_node(key) else {
            return false;
        };
        match &node.data {
            CrdtData::Map { children, .. } => match children.get(map_key) {
                Some(ck) => *ck,
                None => return false,
            },
            _ => return false,
        }
    };

    // Remove from children map
    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Map { children, .. } = &mut node.data
    {
        children.remove(map_key);
    }

    // Remove the child node
    doc.remove_node(child_key);
    true
}

/// Get all keys from a LiveMap.
pub fn keys(doc: &Document, key: NodeKey) -> Vec<String> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::Map { children, .. } => children.keys().cloned().collect(),
        _ => vec![],
    }
}

/// Get all plain JSON values from a LiveMap.
pub fn values(doc: &Document, key: NodeKey) -> Vec<Json> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::Map { children, .. } => {
            let mut result = Vec::new();
            for child_key in children.values() {
                if let Some(child) = doc.get_node(*child_key)
                    && let CrdtData::Register { data } = &child.data
                {
                    result.push(data.clone());
                }
            }
            result
        }
        _ => vec![],
    }
}

/// Get all key-value pairs from a LiveMap (plain values only).
pub fn entries(doc: &Document, key: NodeKey) -> Vec<(String, Json)> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::Map { children, .. } => {
            let mut result = Vec::new();
            for (map_key, child_key) in children {
                if let Some(child) = doc.get_node(*child_key)
                    && let CrdtData::Register { data } = &child.data
                {
                    result.push((map_key.clone(), data.clone()));
                }
            }
            result
        }
        _ => vec![],
    }
}

/// Serialize a LiveMap to a SerializedCrdt.
pub fn serialize(doc: &Document, key: NodeKey) -> Option<crate::types::SerializedCrdt> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Map { .. } => Some(crate::types::SerializedCrdt {
            crdt_type: crate::types::CrdtType::Map,
            parent_id: node.parent_id.clone(),
            parent_key: node.parent_key.clone(),
            data: None,
        }),
        _ => None,
    }
}

/// Convert a LiveMap to its immutable JSON representation.
pub fn to_immutable(doc: &Document, key: NodeKey) -> Option<Json> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Map { children, .. } => {
            let mut result = BTreeMap::new();
            for (map_key, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let value = match &child.data {
                        CrdtData::Register { data } => data.clone(),
                        CrdtData::Object { .. } => {
                            crate::crdt::object::to_immutable(doc, *child_key)?
                        }
                        CrdtData::List { .. } => crate::crdt::list::to_immutable(doc, *child_key)?,
                        CrdtData::Map { .. } => to_immutable(doc, *child_key)?,
                    };
                    result.insert(map_key.clone(), value);
                }
            }
            Some(Json::Object(result))
        }
        _ => None,
    }
}

/// Generate the ops needed to recreate this LiveMap and all its children.
pub fn to_ops(doc: &Document, key: NodeKey, parent_id: &str, parent_key: &str) -> Vec<Op> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::Map { children, .. } => {
            let mut ops = vec![Op {
                op_code: OpCode::CreateMap,
                id: node.id.clone(),
                op_id: None,
                parent_id: Some(parent_id.to_string()),
                parent_key: Some(parent_key.to_string()),
                data: None,
                intent: None,
                deleted_id: None,
                key: None,
            }];

            for (map_key, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let child_ops = match &child.data {
                        CrdtData::Register { .. } => {
                            crate::crdt::register::to_ops(doc, *child_key, &node.id, map_key)
                        }
                        CrdtData::Object { .. } => {
                            crate::crdt::object::to_ops(doc, *child_key, &node.id, map_key)
                        }
                        CrdtData::List { .. } => {
                            crate::crdt::list::to_ops(doc, *child_key, &node.id, map_key)
                        }
                        CrdtData::Map { .. } => to_ops(doc, *child_key, &node.id, map_key),
                    };
                    ops.extend(child_ops);
                }
            }

            ops
        }
        _ => vec![],
    }
}

// ---- Internal helpers ----

/// Remove the child node at a given key, if any.
fn remove_child_at_key(doc: &mut Document, key: NodeKey, map_key: &str) {
    let child_key = {
        let Some(node) = doc.get_node(key) else {
            return;
        };
        match &node.data {
            CrdtData::Map { children, .. } => children.get(map_key).copied(),
            _ => return,
        }
    };

    if let Some(ck) = child_key {
        // Remove the old child from the map
        if let Some(node) = doc.get_node_mut(key)
            && let CrdtData::Map { children, .. } = &mut node.data
        {
            children.remove(map_key);
        }
        // Remove the node from the document
        doc.remove_node(ck);
    }
}
