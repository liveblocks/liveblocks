use std::collections::HashMap;

use crate::arena::NodeKey;
use crate::crdt::node::{CrdtData, CrdtNode};
use crate::crdt::object;
use crate::document::Document;
use crate::types::{ApplyResult, Json, Op, OpCode, OpSource, is_ignored_op};
use crate::updates::{ListUpdateEntry, StorageUpdate, UpdateDelta};

/// Apply a single operation to the document.
/// Routes by OpCode to the correct handler, handles ACK hack.
pub fn apply_op(doc: &mut Document, op: &Op, source: OpSource) -> ApplyResult {
    // Handle the IgnoredOp/ACK hack
    if is_ignored_op(op) {
        return ApplyResult::NotModified;
    }

    match op.op_code {
        OpCode::Init => apply_init(doc, op),
        OpCode::CreateObject | OpCode::CreateList | OpCode::CreateMap | OpCode::CreateRegister => {
            apply_create(doc, op, source)
        }
        OpCode::UpdateObject => apply_update_object(doc, op, source),
        OpCode::DeleteCrdt => apply_delete_crdt(doc, op),
        OpCode::DeleteObjectKey => apply_delete_object_key(doc, op, source),
        OpCode::SetParentKey => apply_set_parent_key(doc, op),
    }
}

/// Apply a batch of operations to the document.
pub fn apply_ops(doc: &mut Document, ops: &[Op], source: OpSource) -> Vec<ApplyResult> {
    ops.iter().map(|op| apply_op(doc, op, source)).collect()
}

// ---- INIT ----

/// Apply an INIT op: create the root LiveObject.
fn apply_init(doc: &mut Document, op: &Op) -> ApplyResult {
    if doc.root_key().is_some() {
        return ApplyResult::NotModified;
    }

    let mut root = CrdtNode::new_object(op.id.clone());

    // If the op has data, populate the root object's children
    if let Some(Json::Object(data)) = &op.data {
        let root_id = op.id.clone();
        let root_key = doc.insert_root(root);
        for (key, value) in data {
            let reg_id = format!("{}:{}", root_id, key);
            let mut reg = CrdtNode::new_register(reg_id, value.clone());
            reg.parent_id = Some(root_id.clone());
            reg.parent_key = Some(key.clone());
            let reg_key = doc.insert_node(reg);
            if let Some(node) = doc.get_node_mut(root_key)
                && let CrdtData::Object { children, .. } = &mut node.data
            {
                children.insert(key.clone(), reg_key);
            }
        }

        let mut updates = HashMap::new();
        for (key, value) in data {
            updates.insert(
                key.clone(),
                UpdateDelta::Set {
                    old_value: None,
                    new_value: value.clone(),
                },
            );
        }
        return ApplyResult::Modified {
            reverse: vec![],
            update: StorageUpdate::LiveObjectUpdate {
                node_id: root_id,
                updates,
            },
        };
    }

    root.parent_id = None;
    root.parent_key = None;
    let node_id = op.id.clone();
    doc.insert_root(root);

    ApplyResult::Modified {
        reverse: vec![],
        update: StorageUpdate::LiveObjectUpdate {
            node_id,
            updates: HashMap::new(),
        },
    }
}

// ---- CREATE_* ----

/// Apply a CREATE_* op: create a new CRDT node and attach to parent.
fn apply_create(doc: &mut Document, op: &Op, source: OpSource) -> ApplyResult {
    let parent_id = match &op.parent_id {
        Some(id) => id.clone(),
        None => return ApplyResult::NotModified,
    };
    let parent_key = match &op.parent_key {
        Some(k) => k.clone(),
        None => return ApplyResult::NotModified,
    };

    // Check if node already exists (duplicate/ACK)
    if doc.get_key_by_id(&op.id).is_some() {
        return ApplyResult::NotModified;
    }

    // Find the parent node
    let parent_node_key = match doc.get_key_by_id(&parent_id) {
        Some(k) => k,
        None => return ApplyResult::NotModified,
    };

    // Determine parent type and route to appropriate attach handler
    let parent_type = doc
        .get_node(parent_node_key)
        .map(|n| n.data.clone())
        .unwrap();

    match parent_type {
        CrdtData::Object { .. } => {
            attach_child_to_object(doc, parent_node_key, &parent_id, &parent_key, op, source)
        }
        CrdtData::List { .. } => {
            attach_child_to_list(doc, parent_node_key, &parent_id, &parent_key, op)
        }
        CrdtData::Map { .. } => {
            attach_child_to_map(doc, parent_node_key, &parent_id, &parent_key, op)
        }
        CrdtData::Register { .. } => ApplyResult::NotModified,
    }
}

/// Create a CrdtNode from a CREATE_* op.
fn node_from_create_op(op: &Op) -> CrdtNode {
    let mut node = match op.op_code {
        // If op has data, register children are populated after insertion
        // to avoid borrow issues (see attach_child_to_object).
        OpCode::CreateObject => CrdtNode::new_object(op.id.clone()),
        OpCode::CreateList => CrdtNode::new_list(op.id.clone()),
        OpCode::CreateMap => CrdtNode::new_map(op.id.clone()),
        OpCode::CreateRegister => {
            let data = op.data.clone().unwrap_or(Json::Null);
            CrdtNode::new_register(op.id.clone(), data)
        }
        _ => CrdtNode::new_object(op.id.clone()),
    };
    node.parent_id = op.parent_id.clone();
    node.parent_key = op.parent_key.clone();
    node
}

/// Attach a child CRDT node to a LiveObject parent.
fn attach_child_to_object(
    doc: &mut Document,
    parent_key: NodeKey,
    parent_id: &str,
    prop: &str,
    op: &Op,
    _source: OpSource,
) -> ApplyResult {
    // Build reverse ops from current value at this key
    let reverse = build_reverse_for_key(doc, parent_key, parent_id, prop);

    // Remove old child at this key if any
    let old_child_key = {
        let parent = doc.get_node(parent_key);
        parent.and_then(|n| match &n.data {
            CrdtData::Object { children, .. } => children.get(prop).copied(),
            _ => None,
        })
    };
    if let Some(old_ck) = old_child_key {
        // Remove old child from children map
        if let Some(node) = doc.get_node_mut(parent_key)
            && let CrdtData::Object { children, .. } = &mut node.data
        {
            children.remove(prop);
        }
        doc.remove_node(old_ck);
    }

    // Create and insert the new child
    let child_node = node_from_create_op(op);
    let child_key = doc.insert_node(child_node);

    // If CREATE_OBJECT with inline data, populate register children
    if op.op_code == OpCode::CreateObject
        && let Some(Json::Object(data)) = &op.data
    {
        for (key, value) in data {
            let reg_id = format!("{}:{}", op.id, key);
            let mut reg = CrdtNode::new_register(reg_id, value.clone());
            reg.parent_id = Some(op.id.clone());
            reg.parent_key = Some(key.clone());
            let reg_key = doc.insert_node(reg);
            if let Some(child) = doc.get_node_mut(child_key)
                && let CrdtData::Object { children, .. } = &mut child.data
            {
                children.insert(key.clone(), reg_key);
            }
        }
    }

    // Insert child into parent's children map
    if let Some(node) = doc.get_node_mut(parent_key)
        && let CrdtData::Object { children, .. } = &mut node.data
    {
        children.insert(prop.to_string(), child_key);
    }

    let mut updates = HashMap::new();
    updates.insert(
        prop.to_string(),
        UpdateDelta::Set {
            old_value: None,
            new_value: Json::Null, // Placeholder for CRDT child
        },
    );

    ApplyResult::Modified {
        reverse,
        update: StorageUpdate::LiveObjectUpdate {
            node_id: parent_id.to_string(),
            updates,
        },
    }
}

/// Attach a child CRDT node to a LiveList parent.
fn attach_child_to_list(
    doc: &mut Document,
    parent_key: NodeKey,
    parent_id: &str,
    position: &str,
    op: &Op,
) -> ApplyResult {
    // Create and insert the new child
    let child_node = node_from_create_op(op);
    let child_key = doc.insert_node(child_node);

    // Insert into the list's children at the correct sorted position
    if let Some(node) = doc.get_node_mut(parent_key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        let insert_idx = children
            .iter()
            .position(|(pos, _)| pos.as_str() > position)
            .unwrap_or(children.len());
        children.insert(insert_idx, (position.to_string(), child_key));

        let updates = vec![ListUpdateEntry::Insert {
            index: insert_idx,
            value: Json::Null, // Placeholder
        }];

        ApplyResult::Modified {
            reverse: vec![Op {
                op_code: OpCode::DeleteCrdt,
                id: op.id.clone(),
                op_id: None,
                parent_id: None,
                parent_key: None,
                data: None,
                intent: None,
                deleted_id: None,
                key: None,
            }],
            update: StorageUpdate::LiveListUpdate {
                node_id: parent_id.to_string(),
                updates,
            },
        }
    } else {
        // Parent is not a list (shouldn't happen)
        doc.remove_node(child_key);
        ApplyResult::NotModified
    }
}

/// Attach a child CRDT node to a LiveMap parent.
fn attach_child_to_map(
    doc: &mut Document,
    parent_key: NodeKey,
    parent_id: &str,
    map_key: &str,
    op: &Op,
) -> ApplyResult {
    // Build reverse from current value at this key
    let reverse = build_reverse_for_map_key(doc, parent_key, parent_id, map_key);

    // Remove old child at this key
    let old_child_key = {
        let parent = doc.get_node(parent_key);
        parent.and_then(|n| match &n.data {
            CrdtData::Map { children, .. } => children.get(map_key).copied(),
            _ => None,
        })
    };
    if let Some(old_ck) = old_child_key {
        if let Some(node) = doc.get_node_mut(parent_key)
            && let CrdtData::Map { children, .. } = &mut node.data
        {
            children.remove(map_key);
        }
        doc.remove_node(old_ck);
    }

    // Create and insert the new child
    let child_node = node_from_create_op(op);
    let child_key = doc.insert_node(child_node);

    // Insert into map's children
    if let Some(node) = doc.get_node_mut(parent_key)
        && let CrdtData::Map { children, .. } = &mut node.data
    {
        children.insert(map_key.to_string(), child_key);
    }

    let mut updates = HashMap::new();
    updates.insert(
        map_key.to_string(),
        UpdateDelta::Set {
            old_value: None,
            new_value: Json::Null, // Placeholder for CRDT child
        },
    );

    ApplyResult::Modified {
        reverse,
        update: StorageUpdate::LiveMapUpdate {
            node_id: parent_id.to_string(),
            updates,
        },
    }
}

// ---- UPDATE_OBJECT ----

/// Apply an UPDATE_OBJECT op.
fn apply_update_object(doc: &mut Document, op: &Op, source: OpSource) -> ApplyResult {
    let node_key = match doc.get_key_by_id(&op.id) {
        Some(k) => k,
        None => return ApplyResult::NotModified,
    };
    object::apply_update(doc, node_key, op, source)
}

// ---- DELETE_CRDT ----

/// Apply a DELETE_CRDT op: remove a node and detach from parent.
fn apply_delete_crdt(doc: &mut Document, op: &Op) -> ApplyResult {
    let node_key = match doc.get_key_by_id(&op.id) {
        Some(k) => k,
        None => return ApplyResult::NotModified,
    };

    // Get the node's parent info and generate reverse ops
    let (parent_id, parent_key_str, _node_id) = {
        let node = match doc.get_node(node_key) {
            Some(n) => n,
            None => return ApplyResult::NotModified,
        };
        (
            node.parent_id.clone(),
            node.parent_key.clone(),
            node.id.clone(),
        )
    };

    // Generate reverse ops (CREATE ops to recreate the subtree)
    let reverse = generate_create_ops_for_subtree(doc, node_key);

    // Find and update the parent to remove this child
    if let Some(pid) = &parent_id
        && let Some(parent_node_key) = doc.get_key_by_id(pid)
    {
        remove_child_from_parent(doc, parent_node_key, &parent_key_str, node_key);
    }

    // Remove the node (and recursively remove its children)
    remove_node_recursive(doc, node_key);

    let parent_nid = parent_id.unwrap_or_default();
    let pkey = parent_key_str.unwrap_or_default();

    let mut updates = HashMap::new();
    updates.insert(
        pkey,
        UpdateDelta::Delete {
            old_value: Json::Null,
        },
    );

    ApplyResult::Modified {
        reverse,
        update: StorageUpdate::LiveObjectUpdate {
            node_id: parent_nid,
            updates,
        },
    }
}

// ---- DELETE_OBJECT_KEY ----

/// Apply a DELETE_OBJECT_KEY op.
fn apply_delete_object_key(doc: &mut Document, op: &Op, source: OpSource) -> ApplyResult {
    let node_key = match doc.get_key_by_id(&op.id) {
        Some(k) => k,
        None => return ApplyResult::NotModified,
    };
    object::apply_delete_object_key(doc, node_key, op, source)
}

// ---- SET_PARENT_KEY ----

/// Apply a SET_PARENT_KEY op: update a node's parent_key (used for LiveList moves).
fn apply_set_parent_key(doc: &mut Document, op: &Op) -> ApplyResult {
    let node_key = match doc.get_key_by_id(&op.id) {
        Some(k) => k,
        None => return ApplyResult::NotModified,
    };

    let new_parent_key = match &op.parent_key {
        Some(k) => k.clone(),
        None => return ApplyResult::NotModified,
    };

    // Get old parent key for reverse op
    let (old_parent_key, parent_id, node_id) = {
        let node = match doc.get_node(node_key) {
            Some(n) => n,
            None => return ApplyResult::NotModified,
        };
        (
            node.parent_key.clone(),
            node.parent_id.clone(),
            node.id.clone(),
        )
    };

    // Update the node's parent_key
    if let Some(node) = doc.get_node_mut(node_key) {
        node.parent_key = Some(new_parent_key.clone());
    }

    // If the parent is a list, update the position and re-sort
    if let Some(pid) = &parent_id
        && let Some(parent_node_key) = doc.get_key_by_id(pid)
        && let Some(parent) = doc.get_node_mut(parent_node_key)
        && let CrdtData::List { children, .. } = &mut parent.data
    {
        // Find and update the position for this child
        if let Some(entry) = children.iter_mut().find(|(_, ck)| *ck == node_key) {
            entry.0 = new_parent_key.clone();
        }
        // Re-sort by position
        children.sort_by(|(a, _), (b, _)| a.cmp(b));
    }

    // Generate reverse op
    let reverse = vec![Op {
        op_code: OpCode::SetParentKey,
        id: node_id,
        op_id: None,
        parent_id: None,
        parent_key: old_parent_key,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    }];

    let parent_nid = parent_id.unwrap_or_default();
    ApplyResult::Modified {
        reverse,
        update: StorageUpdate::LiveListUpdate {
            node_id: parent_nid,
            updates: vec![],
        },
    }
}

// ---- Internal helpers ----

/// Build reverse ops for the current value at a key in a LiveObject parent.
fn build_reverse_for_key(
    doc: &Document,
    parent_key: NodeKey,
    parent_id: &str,
    prop: &str,
) -> Vec<Op> {
    let parent = match doc.get_node(parent_key) {
        Some(n) => n,
        None => return vec![],
    };

    match &parent.data {
        CrdtData::Object { children, .. } => {
            if let Some(child_key) = children.get(prop) {
                if let Some(child) = doc.get_node(*child_key) {
                    match &child.data {
                        CrdtData::Register { data } => {
                            // Reverse: UPDATE_OBJECT with old value
                            let mut d = std::collections::BTreeMap::new();
                            d.insert(prop.to_string(), data.clone());
                            vec![Op {
                                op_code: OpCode::UpdateObject,
                                id: parent_id.into(),
                                op_id: None,
                                parent_id: None,
                                parent_key: None,
                                data: Some(Json::Object(d)),
                                intent: None,
                                deleted_id: None,
                                key: None,
                            }]
                        }
                        _ => {
                            // Reverse: recreate the child CRDT subtree
                            generate_create_ops_for_subtree(doc, *child_key)
                        }
                    }
                } else {
                    vec![]
                }
            } else {
                // No existing value: reverse is DELETE_OBJECT_KEY
                vec![Op {
                    op_code: OpCode::DeleteObjectKey,
                    id: parent_id.into(),
                    op_id: None,
                    parent_id: None,
                    parent_key: None,
                    data: None,
                    intent: None,
                    deleted_id: None,
                    key: Some(prop.into()),
                }]
            }
        }
        _ => vec![],
    }
}

/// Build reverse ops for the current value at a key in a LiveMap parent.
fn build_reverse_for_map_key(
    doc: &Document,
    parent_key: NodeKey,
    _parent_id: &str,
    map_key: &str,
) -> Vec<Op> {
    let parent = match doc.get_node(parent_key) {
        Some(n) => n,
        None => return vec![],
    };

    match &parent.data {
        CrdtData::Map { children, .. } => {
            if let Some(child_key) = children.get(map_key) {
                // Reverse: recreate the old child
                generate_create_ops_for_subtree(doc, *child_key)
            } else {
                // No existing value: reverse is DELETE_CRDT of the new node
                // (This is handled by the caller since we don't know the new node ID here)
                vec![]
            }
        }
        _ => vec![],
    }
}

/// Generate CREATE_* ops to recreate a node and its subtree.
fn generate_create_ops_for_subtree(doc: &Document, node_key: NodeKey) -> Vec<Op> {
    let node = match doc.get_node(node_key) {
        Some(n) => n,
        None => return vec![],
    };

    let parent_id = node.parent_id.clone().unwrap_or_default();
    let parent_key = node.parent_key.clone().unwrap_or_default();

    match &node.data {
        CrdtData::Object { .. } => object::to_ops(doc, node_key, &parent_id, &parent_key),
        CrdtData::List { .. } => crate::crdt::list::to_ops(doc, node_key, &parent_id, &parent_key),
        CrdtData::Map { .. } => crate::crdt::map::to_ops(doc, node_key, &parent_id, &parent_key),
        CrdtData::Register { .. } => {
            crate::crdt::register::to_ops(doc, node_key, &parent_id, &parent_key)
        }
    }
}

/// Remove a child from a parent's children collection.
fn remove_child_from_parent(
    doc: &mut Document,
    parent_key: NodeKey,
    child_parent_key: &Option<String>,
    child_node_key: NodeKey,
) {
    let Some(parent) = doc.get_node_mut(parent_key) else {
        return;
    };

    match &mut parent.data {
        CrdtData::Object { children, .. } => {
            if let Some(key) = child_parent_key
                && children.get(key).copied() == Some(child_node_key)
            {
                children.remove(key);
            }
        }
        CrdtData::List { children, .. } => {
            children.retain(|(_, ck)| *ck != child_node_key);
        }
        CrdtData::Map { children, .. } => {
            if let Some(key) = child_parent_key
                && children.get(key).copied() == Some(child_node_key)
            {
                children.remove(key);
            }
        }
        CrdtData::Register { .. } => {}
    }
}

/// Recursively remove a node and all its descendants from the document.
fn remove_node_recursive(doc: &mut Document, node_key: NodeKey) {
    // Collect child keys first to avoid borrow issues
    let child_keys: Vec<NodeKey> = {
        let Some(node) = doc.get_node(node_key) else {
            return;
        };
        match &node.data {
            CrdtData::Object { children, .. } => children.values().copied().collect(),
            CrdtData::List { children, .. } => children.iter().map(|(_, ck)| *ck).collect(),
            CrdtData::Map { children, .. } => children.values().copied().collect(),
            CrdtData::Register { .. } => vec![],
        }
    };

    // Recursively remove children
    for ck in child_keys {
        remove_node_recursive(doc, ck);
    }

    // Remove this node
    doc.remove_node(node_key);
}
