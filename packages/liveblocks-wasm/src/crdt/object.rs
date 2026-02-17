use std::collections::{BTreeMap, HashMap};

use crate::arena::NodeKey;
use crate::crdt::node::CrdtData;
use crate::document::Document;
use crate::types::{ApplyResult, CrdtType, Json, Op, OpCode, OpSource, SerializedCrdt};
use crate::updates::{StorageUpdate, UpdateDelta};

/// Get a plain JSON value from a LiveObject property.
/// Returns None if the key doesn't exist, the node isn't an Object,
/// or the property holds a child CRDT node rather than plain JSON.
pub fn get_plain<'a>(doc: &'a Document, key: NodeKey, prop: &str) -> Option<&'a Json> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Object { children, .. } => {
            let child_key = children.get(prop)?;
            // Check if the child is a Register (plain value wrapper)
            match &doc.get_node(*child_key)?.data {
                CrdtData::Register { data } => Some(data),
                _ => None,
            }
        }
        _ => None,
    }
}

/// Get the NodeKey of a child CRDT node stored at a property.
pub fn get_child(doc: &Document, key: NodeKey, prop: &str) -> Option<NodeKey> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Object { children, .. } => children.get(prop).copied(),
        _ => None,
    }
}

/// Set a plain JSON value on a LiveObject property.
/// Wraps the value in a LiveRegister internally.
pub fn set_plain(doc: &mut Document, key: NodeKey, prop: &str, value: Json) {
    // Generate a simple ID for the register
    let reg_id = format!(
        "{}:{}",
        doc.get_node(key).map(|n| &n.id[..]).unwrap_or("?"),
        prop
    );
    let mut reg_node = crate::crdt::node::CrdtNode::new_register(reg_id, value);

    let parent_id = doc.get_node(key).map(|n| n.id.clone());
    reg_node.parent_id = parent_id;
    reg_node.parent_key = Some(prop.to_string());

    // Remove old child if any
    remove_child_at_key(doc, key, prop);

    let reg_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Object { children, .. } = &mut node.data
    {
        children.insert(prop.to_string(), reg_key);
    }
}

/// Set a plain JSON value on a LiveObject property using a specific register ID.
/// Like `set_plain`, but the caller provides the register node ID
/// (a wire-format ID from `IdGenerator`).
pub fn set_plain_with_id(
    doc: &mut Document,
    key: NodeKey,
    prop: &str,
    value: Json,
    reg_id: &str,
) {
    let mut reg_node = crate::crdt::node::CrdtNode::new_register(reg_id.to_string(), value);

    let parent_id = doc.get_node(key).map(|n| n.id.clone());
    reg_node.parent_id = parent_id;
    reg_node.parent_key = Some(prop.to_string());

    // Remove old child if any
    remove_child_at_key(doc, key, prop);

    let reg_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Object { children, .. } = &mut node.data
    {
        children.insert(prop.to_string(), reg_key);
    }
}

/// Set a child CRDT node at a property on a LiveObject.
pub fn set_child(doc: &mut Document, key: NodeKey, prop: &str, child_key: NodeKey) {
    // Set parent info on the child
    let parent_id = doc.get_node(key).map(|n| n.id.clone());
    if let Some(child) = doc.get_node_mut(child_key) {
        child.parent_id = parent_id;
        child.parent_key = Some(prop.to_string());
    }

    // Remove old child if any
    remove_child_at_key(doc, key, prop);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Object { children, .. } = &mut node.data
    {
        children.insert(prop.to_string(), child_key);
    }
}

/// Delete a property from a LiveObject.
pub fn delete_key(doc: &mut Document, key: NodeKey, prop: &str) {
    remove_child_at_key(doc, key, prop);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Object { children, .. } = &mut node.data
    {
        children.remove(prop);
    }
}

/// Remove the child node at a given property, if any.
fn remove_child_at_key(doc: &mut Document, key: NodeKey, prop: &str) {
    let child_key = {
        let node = match doc.get_node(key) {
            Some(n) => n,
            None => return,
        };
        match &node.data {
            CrdtData::Object { children, .. } => children.get(prop).copied(),
            _ => return,
        }
    };

    let Some(ck) = child_key else { return };
    // Only remove registers that we created as plain value wrappers
    // Don't remove external CRDT nodes from the document
    let is_register = doc
        .get_node(ck)
        .is_some_and(|child| matches!(&child.data, CrdtData::Register { .. }));
    if is_register {
        doc.remove_node(ck);
    }
}

/// Get all property names from a LiveObject.
pub fn keys(doc: &Document, key: NodeKey) -> Vec<String> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::Object { children, .. } => children.keys().cloned().collect(),
        _ => vec![],
    }
}

/// Convert a LiveObject to a flat HashMap of plain JSON values.
/// Child CRDT nodes are excluded (only plain values via registers).
pub fn to_object(doc: &Document, key: NodeKey) -> HashMap<String, Json> {
    let Some(node) = doc.get_node(key) else {
        return HashMap::new();
    };
    match &node.data {
        CrdtData::Object { children, .. } => {
            let mut result = HashMap::new();
            for (prop, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    match &child.data {
                        CrdtData::Register { data } => {
                            result.insert(prop.clone(), data.clone());
                        }
                        _ => {
                            // CRDT children are not included in to_object
                        }
                    }
                }
            }
            result
        }
        _ => HashMap::new(),
    }
}

/// Convert a LiveObject to its immutable JSON representation (recursive).
pub fn to_immutable(doc: &Document, key: NodeKey) -> Option<Json> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Object { children, .. } => {
            let mut result = BTreeMap::new();
            for (prop, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let value = match &child.data {
                        CrdtData::Register { data } => data.clone(),
                        CrdtData::Object { .. } => to_immutable(doc, *child_key)?,
                        CrdtData::List { .. } => crate::crdt::list::to_immutable(doc, *child_key)?,
                        CrdtData::Map { .. } => crate::crdt::map::to_immutable(doc, *child_key)?,
                    };
                    result.insert(prop.clone(), value);
                }
            }
            Some(Json::Object(result))
        }
        _ => None,
    }
}

/// Serialize a LiveObject to a SerializedCrdt.
pub fn serialize(doc: &Document, key: NodeKey) -> Option<SerializedCrdt> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Object { children, .. } => {
            // Collect only plain data (registers) into the data field
            let mut data = BTreeMap::new();
            for (prop, child_key) in children {
                if let Some(child) = doc.get_node(*child_key)
                    && let CrdtData::Register { data: val } = &child.data
                {
                    data.insert(prop.clone(), val.clone());
                }
            }

            Some(SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: node.parent_id.clone(),
                parent_key: node.parent_key.clone(),
                data: Some(Json::Object(data)),
            })
        }
        _ => None,
    }
}

/// Generate the ops needed to recreate this LiveObject and all its children.
pub fn to_ops(doc: &Document, key: NodeKey, parent_id: &str, parent_key: &str) -> Vec<Op> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::Object { children, .. } => {
            let mut ops = Vec::new();

            // Collect plain data for the CREATE_OBJECT op
            let mut plain_data = BTreeMap::new();
            let mut child_ops = Vec::new();

            for (prop, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    match &child.data {
                        CrdtData::Register { data } => {
                            plain_data.insert(prop.clone(), data.clone());
                        }
                        _ => {
                            // Recursively generate ops for child CRDT nodes
                            child_ops.extend(generate_child_ops(doc, *child_key, &node.id, prop));
                        }
                    }
                }
            }

            ops.push(Op {
                op_code: OpCode::CreateObject,
                id: node.id.clone(),
                op_id: None,
                parent_id: Some(parent_id.to_string()),
                parent_key: Some(parent_key.to_string()),
                data: Some(Json::Object(plain_data)),
                intent: None,
                deleted_id: None,
                key: None,
            });

            ops.extend(child_ops);
            ops
        }
        _ => vec![],
    }
}

/// Generate ops for a child CRDT node (dispatch by type).
fn generate_child_ops(
    doc: &Document,
    child_key: NodeKey,
    parent_id: &str,
    parent_key_str: &str,
) -> Vec<Op> {
    let Some(child) = doc.get_node(child_key) else {
        return vec![];
    };
    match &child.data {
        CrdtData::Register { .. } => {
            crate::crdt::register::to_ops(doc, child_key, parent_id, parent_key_str)
        }
        CrdtData::Object { .. } => to_ops(doc, child_key, parent_id, parent_key_str),
        CrdtData::List { .. } => {
            crate::crdt::list::to_ops(doc, child_key, parent_id, parent_key_str)
        }
        CrdtData::Map { .. } => crate::crdt::map::to_ops(doc, child_key, parent_id, parent_key_str),
    }
}

/// Apply an UPDATE_OBJECT op to a LiveObject.
/// Handles LWW conflict resolution with unacked op tracking.
pub fn apply_update(doc: &mut Document, key: NodeKey, op: &Op, source: OpSource) -> ApplyResult {
    let op_data = match &op.data {
        Some(Json::Object(data)) => data.clone(),
        _ => return ApplyResult::NotModified,
    };

    let node_id = match doc.get_node(key) {
        Some(n) => n.id.clone(),
        None => return ApplyResult::NotModified,
    };

    let mut is_modified = false;
    let mut reverse_data = BTreeMap::new();
    let mut reverse_deletes = Vec::new();
    let mut update_deltas = HashMap::new();

    for (prop, new_value) in &op_data {
        // Get the current unacked op for this key
        let unacked_op_id = get_unacked_op(doc, key, prop);

        match source {
            OpSource::Local => {
                // Track locally-generated opId
                if let Some(op_id) = &op.op_id {
                    set_unacked_op(doc, key, prop, op_id.clone());
                }
            }
            OpSource::Theirs | OpSource::Ours => {
                if let Some(unacked_id) = &unacked_op_id {
                    if op.op_id.as_deref() == Some(unacked_id.as_str()) {
                        // ACK: clear tracking
                        clear_unacked_op(doc, key, prop);
                        continue;
                    } else {
                        // Conflict: ignore remote op for this key
                        continue;
                    }
                }
                // No unacked op → apply remote
            }
        }

        // Capture old value for reverse ops
        let old_value = get_plain_value(doc, key, prop);
        if let Some(ref val) = old_value {
            reverse_data.insert(prop.clone(), val.clone());
        } else {
            reverse_deletes.push(Op {
                op_code: OpCode::DeleteObjectKey,
                id: node_id.clone(),
                op_id: None,
                parent_id: None,
                parent_key: None,
                data: None,
                intent: None,
                deleted_id: None,
                key: Some(prop.clone()),
            });
        }

        // Apply the update
        set_plain(doc, key, prop, new_value.clone());
        is_modified = true;
        update_deltas.insert(
            prop.clone(),
            UpdateDelta::Set {
                old_value,
                new_value: new_value.clone(),
            },
        );
    }

    if !is_modified {
        return ApplyResult::NotModified;
    }

    let mut reverse = Vec::new();
    if !reverse_data.is_empty() {
        reverse.push(Op {
            op_code: OpCode::UpdateObject,
            id: node_id.clone(),
            op_id: None,
            parent_id: None,
            parent_key: None,
            data: Some(Json::Object(reverse_data)),
            intent: None,
            deleted_id: None,
            key: None,
        });
    }
    reverse.extend(reverse_deletes);

    ApplyResult::Modified {
        reverse,
        update: StorageUpdate::LiveObjectUpdate {
            node_id,
            updates: update_deltas,
        },
    }
}

/// Apply a DELETE_OBJECT_KEY op to a LiveObject.
pub fn apply_delete_object_key(
    doc: &mut Document,
    key: NodeKey,
    op: &Op,
    source: OpSource,
) -> ApplyResult {
    let prop = match &op.key {
        Some(k) => k.clone(),
        None => return ApplyResult::NotModified,
    };

    // Check if property exists
    let old_value = get_plain_value(doc, key, &prop);
    let has_child = get_child(doc, key, &prop).is_some();

    if old_value.is_none() && !has_child {
        return ApplyResult::NotModified;
    }

    // If remote and we have unacked ops for this key, reject
    if !matches!(source, OpSource::Local) {
        let unacked = get_unacked_op(doc, key, &prop);
        if unacked.is_some() {
            return ApplyResult::NotModified;
        }
    }

    let node_id = match doc.get_node(key) {
        Some(n) => n.id.clone(),
        None => return ApplyResult::NotModified,
    };

    // Generate reverse ops
    let reverse = if let Some(val) = old_value {
        vec![Op {
            op_code: OpCode::UpdateObject,
            id: node_id.clone(),
            op_id: None,
            parent_id: None,
            parent_key: None,
            data: Some(Json::Object({
                let mut m = BTreeMap::new();
                m.insert(prop.clone(), val);
                m
            })),
            intent: None,
            deleted_id: None,
            key: None,
        }]
    } else {
        // Child CRDT node - reverse would be CREATE ops
        // This will be fully implemented in Phase 4
        vec![]
    };

    let update_delta = if let Some(val) = get_plain_value(doc, key, &prop) {
        UpdateDelta::Delete { old_value: val }
    } else {
        UpdateDelta::Delete {
            old_value: Json::Null,
        }
    };

    // Perform deletion
    delete_key(doc, key, &prop);

    let mut updates = HashMap::new();
    updates.insert(prop, update_delta);

    ApplyResult::Modified {
        reverse,
        update: StorageUpdate::LiveObjectUpdate { node_id, updates },
    }
}

// ---- Internal helpers ----

/// Get a plain JSON value from a LiveObject property (cloned).
fn get_plain_value(doc: &Document, key: NodeKey, prop: &str) -> Option<Json> {
    get_plain(doc, key, prop).cloned()
}

/// Get the unacked op ID for a property.
fn get_unacked_op(doc: &Document, key: NodeKey, prop: &str) -> Option<String> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Object { unacked_ops, .. } => unacked_ops.get(prop).cloned(),
        _ => None,
    }
}

/// Set the unacked op ID for a property.
fn set_unacked_op(doc: &mut Document, key: NodeKey, prop: &str, op_id: String) {
    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Object { unacked_ops, .. } = &mut node.data
    {
        unacked_ops.insert(prop.to_string(), op_id);
    }
}

/// Clear the unacked op ID for a property.
fn clear_unacked_op(doc: &mut Document, key: NodeKey, prop: &str) {
    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::Object { unacked_ops, .. } = &mut node.data
    {
        unacked_ops.remove(prop);
    }
}
