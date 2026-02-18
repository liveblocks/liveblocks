use crate::arena::NodeKey;
use crate::crdt::node::{CrdtData, CrdtNode};
use crate::document::Document;
use crate::position;
use crate::types::{Json, Op, OpCode};

/// Information returned by `push_with_id`.
pub struct PushInfo {
    /// The fractional position assigned to the new item.
    pub position: String,
}

/// Information returned by `insert_with_id`.
pub struct InsertInfo {
    /// The fractional position assigned to the new item.
    pub position: String,
}

/// Information returned by `set_with_id`.
pub struct SetInfo {
    /// The fractional position of the replaced item.
    pub position: String,
}

/// Get the number of items in a LiveList.
pub fn length(doc: &Document, key: NodeKey) -> usize {
    let Some(node) = doc.get_node(key) else {
        return 0;
    };
    match &node.data {
        CrdtData::List { children, .. } => children.len(),
        _ => 0,
    }
}

/// Get the value at a given index in a LiveList.
/// Returns the cloned JSON value (unwrapping registers).
pub fn get(doc: &Document, key: NodeKey, index: usize) -> Option<Json> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::List { children, .. } => {
            let (_pos, child_key) = children.get(index)?;
            let child = doc.get_node(*child_key)?;
            match &child.data {
                CrdtData::Register { data } => Some(data.clone()),
                _ => None, // For child CRDT nodes, use get_child instead
            }
        }
        _ => None,
    }
}

/// Get the NodeKey of the child at a given index.
pub fn get_child_key(doc: &Document, key: NodeKey, index: usize) -> Option<NodeKey> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::List { children, .. } => children.get(index).map(|(_, ck)| *ck),
        _ => None,
    }
}

/// Push a plain JSON value to the end of a LiveList.
pub fn push(doc: &mut Document, key: NodeKey, value: Json) {
    let Some(node) = doc.get_node(key) else {
        return;
    };
    if !matches!(&node.data, CrdtData::List { .. }) {
        return;
    }

    let last_pos = get_last_pos(doc, key);
    let new_pos = match last_pos {
        Some(pos) => position::after(&pos),
        None => position::make_position(None, None),
    };

    let node_id = doc.get_node(key).map(|n| n.id.clone()).unwrap_or_default();
    let reg_id = format!("{}:{}", node_id, new_pos);
    let mut reg_node = CrdtNode::new_register(reg_id, value);
    reg_node.parent_id = Some(node_id);
    reg_node.parent_key = Some(new_pos.clone());

    let reg_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.push((new_pos, reg_key));
    }
}

/// Push a child CRDT node to the end of a LiveList.
pub fn push_child(doc: &mut Document, key: NodeKey, child_key: NodeKey) {
    let Some(node) = doc.get_node(key) else {
        return;
    };
    if !matches!(&node.data, CrdtData::List { .. }) {
        return;
    }

    let last_pos = get_last_pos(doc, key);
    let new_pos = match last_pos {
        Some(pos) => position::after(&pos),
        None => position::make_position(None, None),
    };

    let parent_id = doc.get_node(key).map(|n| n.id.clone());
    if let Some(child) = doc.get_node_mut(child_key) {
        child.parent_id = parent_id;
        child.parent_key = Some(new_pos.clone());
    }

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.push((new_pos, child_key));
    }
}

/// Push a plain JSON value to the end of a LiveList, using a specific register ID.
/// Returns the computed fractional position for op construction.
pub fn push_with_id(
    doc: &mut Document,
    key: NodeKey,
    value: Json,
    reg_id: &str,
) -> PushInfo {
    let last_pos = get_last_pos(doc, key);
    let new_pos = match last_pos {
        Some(pos) => position::after(&pos),
        None => position::make_position(None, None),
    };

    let node_id = doc
        .get_node(key)
        .map(|n| n.id.clone())
        .unwrap_or_default();
    let mut reg_node = CrdtNode::new_register(reg_id.to_string(), value);
    reg_node.parent_id = Some(node_id);
    reg_node.parent_key = Some(new_pos.clone());

    let reg_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.push((new_pos.clone(), reg_key));
    }

    PushInfo { position: new_pos }
}

/// Insert a plain JSON value at a given index in a LiveList.
pub fn insert(doc: &mut Document, key: NodeKey, index: usize, value: Json) {
    let Some(node) = doc.get_node(key) else {
        return;
    };
    if !matches!(&node.data, CrdtData::List { .. }) {
        return;
    }

    let (before_pos, after_pos) = get_neighbor_positions(doc, key, index);
    let new_pos = position::make_position(before_pos.as_deref(), after_pos.as_deref());

    let node_id = doc.get_node(key).map(|n| n.id.clone()).unwrap_or_default();
    let reg_id = format!("{}:{}", node_id, new_pos);
    let mut reg_node = CrdtNode::new_register(reg_id, value);
    reg_node.parent_id = Some(node_id);
    reg_node.parent_key = Some(new_pos.clone());

    let reg_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.insert(index, (new_pos, reg_key));
    }
}

/// Insert a plain JSON value at a given index, using a specific register ID.
/// Returns the computed fractional position for op construction.
pub fn insert_with_id(
    doc: &mut Document,
    key: NodeKey,
    index: usize,
    value: Json,
    reg_id: &str,
) -> InsertInfo {
    let (before_pos, after_pos) = get_neighbor_positions(doc, key, index);
    let new_pos = position::make_position(before_pos.as_deref(), after_pos.as_deref());

    let node_id = doc
        .get_node(key)
        .map(|n| n.id.clone())
        .unwrap_or_default();
    let mut reg_node = CrdtNode::new_register(reg_id.to_string(), value);
    reg_node.parent_id = Some(node_id);
    reg_node.parent_key = Some(new_pos.clone());

    let reg_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.insert(index, (new_pos.clone(), reg_key));
    }

    InsertInfo { position: new_pos }
}

/// Replace the value at a given index using a specific register ID.
/// Caller must capture old child info BEFORE calling this (the old child
/// is removed from the arena).
pub fn set_with_id(
    doc: &mut Document,
    key: NodeKey,
    index: usize,
    value: Json,
    new_reg_id: &str,
) -> SetInfo {
    let (pos, old_child_key) = {
        let Some(node) = doc.get_node(key) else {
            return SetInfo {
                position: String::new(),
            };
        };
        match &node.data {
            CrdtData::List { children, .. } => {
                if index >= children.len() {
                    return SetInfo {
                        position: String::new(),
                    };
                }
                (children[index].0.clone(), children[index].1)
            }
            _ => {
                return SetInfo {
                    position: String::new(),
                }
            }
        }
    };

    // Remove old child
    doc.remove_node(old_child_key);

    // Create new register at same position
    let node_id = doc
        .get_node(key)
        .map(|n| n.id.clone())
        .unwrap_or_default();
    let mut reg_node = CrdtNode::new_register(new_reg_id.to_string(), value);
    reg_node.parent_id = Some(node_id);
    reg_node.parent_key = Some(pos.clone());

    let new_child_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
        && index < children.len()
    {
        children[index] = (pos.clone(), new_child_key);
    }

    SetInfo { position: pos }
}

/// Delete the item at a given index from a LiveList.
pub fn delete(doc: &mut Document, key: NodeKey, index: usize) {
    let child_key = {
        let Some(node) = doc.get_node(key) else {
            return;
        };
        match &node.data {
            CrdtData::List { children, .. } => {
                if index >= children.len() {
                    return;
                }
                children[index].1
            }
            _ => return,
        }
    };

    // Remove from children list
    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.remove(index);
    }

    // Remove the child node from the document
    doc.remove_node(child_key);
}

/// Move an item from one index to another in a LiveList.
pub fn move_item(doc: &mut Document, key: NodeKey, from_index: usize, to_index: usize) {
    if from_index == to_index {
        return;
    }

    let Some(node) = doc.get_node(key) else {
        return;
    };
    if !matches!(&node.data, CrdtData::List { .. }) {
        return;
    }

    // Remove the item from its current position
    let (_old_pos, child_key) = {
        let node = doc.get_node(key).unwrap();
        match &node.data {
            CrdtData::List { children, .. } => {
                if from_index >= children.len() {
                    return;
                }
                children[from_index].clone()
            }
            _ => return,
        }
    };

    // Remove from old position
    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.remove(from_index);
    }

    // Compute new position based on target index in the remaining list.
    // After removing the item, the target slot in the original list maps
    // to index `to_index` in the remaining list regardless of direction.
    let (before_pos, after_pos) = get_neighbor_positions(doc, key, to_index);
    let new_pos = if before_pos.is_none() && after_pos.is_none() {
        // List is now empty (shouldn't happen since we just removed one item
        // and are re-inserting it), but handle gracefully
        position::make_position(None, None)
    } else {
        position::make_position(before_pos.as_deref(), after_pos.as_deref())
    };

    // Update parent key on child
    if let Some(child) = doc.get_node_mut(child_key) {
        child.parent_key = Some(new_pos.clone());
    }

    // Re-insert at new position, maintaining sort order
    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        // Find insertion point that maintains sort order
        let insert_idx = children
            .iter()
            .position(|(pos, _)| pos.as_str() > new_pos.as_str())
            .unwrap_or(children.len());
        children.insert(insert_idx, (new_pos, child_key));
    }
}

/// Replace the value at a given index (set operation).
pub fn set(doc: &mut Document, key: NodeKey, index: usize, value: Json) {
    let pos_and_old_key = {
        let Some(node) = doc.get_node(key) else {
            return;
        };
        match &node.data {
            CrdtData::List { children, .. } => {
                if index >= children.len() {
                    return;
                }
                (children[index].0.clone(), children[index].1)
            }
            _ => return,
        }
    };

    let (pos, old_child_key) = pos_and_old_key;

    // Remove old child
    doc.remove_node(old_child_key);

    // Create new register at same position
    let node_id = doc.get_node(key).map(|n| n.id.clone()).unwrap_or_default();
    let reg_id = format!("{}:{}:set", node_id, pos);
    let mut reg_node = CrdtNode::new_register(reg_id, value);
    reg_node.parent_id = Some(node_id);
    reg_node.parent_key = Some(pos.clone());

    let new_child_key = doc.insert_node(reg_node);

    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
        && index < children.len()
    {
        children[index] = (pos, new_child_key);
    }
}

/// Get all values from a LiveList as a Vec.
pub fn to_array(doc: &Document, key: NodeKey) -> Vec<Json> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::List { children, .. } => {
            let mut result = Vec::new();
            for (_pos, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    match &child.data {
                        CrdtData::Register { data } => result.push(data.clone()),
                        _ => {
                            // For child CRDT nodes, convert to immutable representation
                            if let Some(immutable) = to_immutable_single(doc, *child_key) {
                                result.push(immutable);
                            }
                        }
                    }
                }
            }
            result
        }
        _ => vec![],
    }
}

/// Clear all items from a LiveList.
pub fn clear(doc: &mut Document, key: NodeKey) {
    let child_keys: Vec<NodeKey> = {
        let Some(node) = doc.get_node(key) else {
            return;
        };
        match &node.data {
            CrdtData::List { children, .. } => children.iter().map(|(_, ck)| *ck).collect(),
            _ => return,
        }
    };

    // Clear the children list
    if let Some(node) = doc.get_node_mut(key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.clear();
    }

    // Remove all child nodes
    for ck in child_keys {
        doc.remove_node(ck);
    }
}

/// Serialize a LiveList to a SerializedCrdt.
pub fn serialize(doc: &Document, key: NodeKey) -> Option<crate::types::SerializedCrdt> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::List { .. } => Some(crate::types::SerializedCrdt {
            crdt_type: crate::types::CrdtType::List,
            parent_id: node.parent_id.clone(),
            parent_key: node.parent_key.clone(),
            data: None,
        }),
        _ => None,
    }
}

/// Convert a LiveList to its immutable JSON representation.
pub fn to_immutable(doc: &Document, key: NodeKey) -> Option<Json> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::List { children, .. } => {
            let mut items = Vec::new();
            for (_pos, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let value = match &child.data {
                        CrdtData::Register { data } => data.clone(),
                        CrdtData::Object { .. } => {
                            crate::crdt::object::to_immutable(doc, *child_key)?
                        }
                        CrdtData::List { .. } => to_immutable(doc, *child_key)?,
                        CrdtData::Map { .. } => crate::crdt::map::to_immutable(doc, *child_key)?,
                    };
                    items.push(value);
                }
            }
            Some(Json::Array(items))
        }
        _ => None,
    }
}

/// Generate the ops needed to recreate this LiveList and all its children.
pub fn to_ops(doc: &Document, key: NodeKey, parent_id: &str, parent_key: &str) -> Vec<Op> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    match &node.data {
        CrdtData::List { children, .. } => {
            let mut ops = vec![Op {
                op_code: OpCode::CreateList,
                id: node.id.clone(),
                op_id: None,
                parent_id: Some(parent_id.to_string()),
                parent_key: Some(parent_key.to_string()),
                data: None,
                intent: None,
                deleted_id: None,
                key: None,
            }];

            for (pos, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let mut child_ops = match &child.data {
                        CrdtData::Register { .. } => {
                            crate::crdt::register::to_ops(doc, *child_key, &node.id, pos)
                        }
                        CrdtData::Object { .. } => {
                            crate::crdt::object::to_ops(doc, *child_key, &node.id, pos)
                        }
                        CrdtData::List { .. } => to_ops(doc, *child_key, &node.id, pos),
                        CrdtData::Map { .. } => {
                            crate::crdt::map::to_ops(doc, *child_key, &node.id, pos)
                        }
                    };
                    // Match the JS HACK_addIntentAndDeletedIdToOperation:
                    // each child's first op gets intent: "set".
                    if let Some(first) = child_ops.first_mut() {
                        first.intent = Some("set".to_string());
                    }
                    ops.extend(child_ops);
                }
            }

            ops
        }
        _ => vec![],
    }
}

// ---- Internal helpers ----

/// Get the position of the last item in a list.
fn get_last_pos(doc: &Document, key: NodeKey) -> Option<String> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::List { children, .. } => children.last().map(|(pos, _)| pos.clone()),
        _ => None,
    }
}

/// Get the positions of items before and after a given index.
fn get_neighbor_positions(
    doc: &Document,
    key: NodeKey,
    index: usize,
) -> (Option<String>, Option<String>) {
    let Some(node) = doc.get_node(key) else {
        return (None, None);
    };
    match &node.data {
        CrdtData::List { children, .. } => {
            let before = if index > 0 {
                children.get(index - 1).map(|(pos, _)| pos.clone())
            } else {
                None
            };
            let after = children.get(index).map(|(pos, _)| pos.clone());
            (before, after)
        }
        _ => (None, None),
    }
}

/// Convert a single child node to its immutable representation.
fn to_immutable_single(doc: &Document, child_key: NodeKey) -> Option<Json> {
    let child = doc.get_node(child_key)?;
    match &child.data {
        CrdtData::Register { data } => Some(data.clone()),
        CrdtData::Object { .. } => crate::crdt::object::to_immutable(doc, child_key),
        CrdtData::List { .. } => to_immutable(doc, child_key),
        CrdtData::Map { .. } => crate::crdt::map::to_immutable(doc, child_key),
    }
}
