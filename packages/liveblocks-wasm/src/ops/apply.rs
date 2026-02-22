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
        OpCode::DeleteCrdt => apply_delete_crdt(doc, op, source),
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

    // Check if node already exists (duplicate/ACK).
    // For list children, we need to update the position when it differs
    // (matching JS _applyInsertAck behavior where server may relocate the item).
    if let Some(existing_key) = doc.get_key_by_id(&op.id) {
        // Track local set-intent CREATE ops for unacked set detection, even when
        // the node already exists (WASM mutation handles pre-create nodes before
        // this function is called with source=Local). Only set-intent ops are
        // tracked — regular inserts/pushes don't have superseded-set semantics.
        if source == OpSource::Local && op.intent.as_deref() == Some("set") {
            if let Some(op_id) = &op.op_id {
                doc.unacked_creates.insert(
                    (parent_id.clone(), parent_key.clone()),
                    op_id.clone(),
                );
            }
        }

        let parent_node_key = doc.get_key_by_id(&parent_id);

        // Check if the node is currently in the parent's children (for lists).
        // Nodes can be "implicitly deleted" — still in the arena but removed
        // from the parent's children list by a concurrent set conflict.
        let is_in_children = parent_node_key.map_or(false, |pk| {
            doc.get_node(pk).map_or(false, |p| match &p.data {
                CrdtData::List { children, .. } => {
                    children.iter().any(|(_, ck)| *ck == existing_key)
                }
                // For objects/maps, if the node exists, treat it as "in children"
                _ => true,
            })
        });

        // For set ACKs: always process deleted_id first, matching JS
        // #applySetAck which calls #detachItemAssociatedToSetOperation
        // before any other logic.
        let mut has_deleted = false;
        if op.intent.as_deref() == Some("set") {
            if let Some(deleted_id) = &op.deleted_id {
                if let Some(deleted_node_key) = doc.get_key_by_id(deleted_id) {
                    if let Some(pk) = parent_node_key {
                        if let Some(parent) = doc.get_node_mut(pk)
                            && let CrdtData::List { children, .. } = &mut parent.data
                        {
                            children.retain(|(_, ck)| *ck != deleted_node_key);
                        }
                        doc.remove_node_recursive(deleted_node_key);
                        has_deleted = true;
                    }
                }
            }
        }

        if is_in_children {
            // Node is in the parent's children — handle position update
            let needs_position_update = {
                let node = doc.get_node(existing_key);
                node.map(|n| n.parent_key.as_deref() != Some(&parent_key))
                    .unwrap_or(false)
            };

            if needs_position_update {
                if let Some(parent_node_key) = parent_node_key {
                    // Find previous index before the move
                    let previous_index = {
                        doc.get_node(parent_node_key).and_then(|p| match &p.data {
                            CrdtData::List { children, .. } => {
                                children.iter().position(|(_, ck)| *ck == existing_key)
                            }
                            _ => None,
                        })
                    };

                    // Shift any item currently at the target position
                    // (matching JS #applyInsertAck → #shiftItemPosition)
                    if let Some(parent) = doc.get_node(parent_node_key)
                        && let CrdtData::List { children, .. } = &parent.data
                    {
                        if let Some(conflict_idx) = children
                            .iter()
                            .position(|(pos, ck)| pos.as_str() == parent_key && *ck != existing_key)
                        {
                            let conflict_child_key = children[conflict_idx].1;
                            let before_pos = Some(parent_key.clone());
                            let after_pos =
                                children.get(conflict_idx + 1).map(|(pos, _)| pos.clone());
                            let shifted_pos = crate::position::make_position(
                                before_pos.as_deref(),
                                after_pos.as_deref(),
                            );
                            if let Some(child) = doc.get_node_mut(conflict_child_key) {
                                child.parent_key = Some(shifted_pos.clone());
                            }
                            if let Some(parent) = doc.get_node_mut(parent_node_key)
                                && let CrdtData::List { children, .. } = &mut parent.data
                            {
                                if let Some(entry) =
                                    children.iter_mut().find(|(_, ck)| *ck == conflict_child_key)
                                {
                                    entry.0 = shifted_pos;
                                }
                            }
                        }
                    }

                    // Update the node's parent_key
                    if let Some(node) = doc.get_node_mut(existing_key) {
                        node.parent_key = Some(parent_key.clone());
                    }

                    // Update position in children vec and re-sort
                    if let Some(parent) = doc.get_node_mut(parent_node_key)
                        && let CrdtData::List { children, .. } = &mut parent.data
                    {
                        if let Some(entry) =
                            children.iter_mut().find(|(_, ck)| *ck == existing_key)
                        {
                            entry.0 = parent_key;
                        }
                        children.sort_by(|(a, _), (b, _)| a.cmp(b));
                    }

                    // Find new index after the move and return Modified with move update
                    let new_index = {
                        doc.get_node(parent_node_key).and_then(|p| match &p.data {
                            CrdtData::List { children, .. } => {
                                children.iter().position(|(_, ck)| *ck == existing_key)
                            }
                            _ => None,
                        })
                    };

                    if let (Some(prev_idx), Some(new_idx)) = (previous_index, new_index) {
                        if prev_idx != new_idx {
                            let value =
                                get_node_immutable_value(doc, existing_key).unwrap_or(Json::Null);
                            return ApplyResult::Modified {
                                reverse: vec![],
                                update: StorageUpdate::LiveListUpdate {
                                    node_id: parent_id,
                                    updates: vec![ListUpdateEntry::Move {
                                        previous_index: prev_idx,
                                        new_index: new_idx,
                                        value,
                                    }],
                                },
                            };
                        }
                    }
                } else {
                    // No parent found, just update parent_key
                    if let Some(node) = doc.get_node_mut(existing_key) {
                        node.parent_key = Some(parent_key);
                    }
                }
            }

            if has_deleted {
                // deleted_id was processed — return Modified even if position unchanged
                return ApplyResult::Modified {
                    reverse: vec![],
                    update: StorageUpdate::LiveListUpdate {
                        node_id: parent_id,
                        updates: vec![],
                    },
                };
            }
            return ApplyResult::NotModified;
        } else if let Some(pk) = parent_node_key {
            // Node is implicitly deleted: exists in the arena but NOT in the
            // parent's children list. This happens when a concurrent set conflict
            // removed it from children but kept it in the arena for potential
            // restoration. Matching JS #applySetAck / #applyInsertAck which
            // restore implicitly deleted items when their ACK arrives.

            // Handle conflict at the target position — implicitly delete any
            // existing item at that position to make room for the restored node.
            if let Some(parent) = doc.get_node(pk)
                && let CrdtData::List { children, .. } = &parent.data
            {
                if let Some(conflict_idx) = children
                    .iter()
                    .position(|(pos, _)| pos.as_str() == parent_key)
                {
                    let conflict_child_key = children[conflict_idx].1;
                    // Shift the conflicting item to make room
                    let before_pos = Some(parent_key.clone());
                    let after_pos =
                        children.get(conflict_idx + 1).map(|(pos, _)| pos.clone());
                    let shifted_pos = crate::position::make_position(
                        before_pos.as_deref(),
                        after_pos.as_deref(),
                    );
                    if let Some(child) = doc.get_node_mut(conflict_child_key) {
                        child.parent_key = Some(shifted_pos.clone());
                    }
                    if let Some(parent) = doc.get_node_mut(pk)
                        && let CrdtData::List { children, .. } = &mut parent.data
                    {
                        if let Some(entry) =
                            children.iter_mut().find(|(_, ck)| *ck == conflict_child_key)
                        {
                            entry.0 = shifted_pos;
                        }
                        children.sort_by(|(a, _), (b, _)| a.cmp(b));
                    }
                }
            }

            // Update the node's parent_key to the target position
            if let Some(node) = doc.get_node_mut(existing_key) {
                node.parent_key = Some(parent_key.clone());
            }

            // Re-insert the node into the parent's children at the correct position
            if let Some(parent) = doc.get_node_mut(pk)
                && let CrdtData::List { children, .. } = &mut parent.data
            {
                let insert_idx = children
                    .iter()
                    .position(|(pos, _)| pos.as_str() > parent_key.as_str())
                    .unwrap_or(children.len());
                children.insert(insert_idx, (parent_key.clone(), existing_key));

                return ApplyResult::Modified {
                    reverse: vec![],
                    update: StorageUpdate::LiveListUpdate {
                        node_id: parent_id,
                        updates: vec![ListUpdateEntry::Insert {
                            index: insert_idx,
                            value: get_node_immutable_value(doc, existing_key)
                                .unwrap_or(Json::Null),
                        }],
                    },
                };
            }
        }

        return ApplyResult::NotModified;
    }

    // Node NOT in arena — ACK handling for source=Ours.
    //
    // The node was created locally but is no longer in the document. Two cases:
    //
    // 1. Set-intent (list.set, map.set): the node may have been removed by a
    //    REMOTE set conflict at the same position/key. Use unacked_creates to
    //    distinguish current vs superseded:
    //    - Current: re-create the node (it was deleted by remote, not locally).
    //    - Superseded: skip (a newer local set overwrote this position/key).
    //
    // 2. Non-set-intent (push, insert, undo-CREATE): the node was created
    //    locally and then deleted by a LOCAL operation (undo or explicit delete).
    //    The DELETE op was also dispatched to the server. Skip re-creation —
    //    the local state has moved past this CREATE.
    //    (For non-set-intent, a remote op cannot delete our node before the ACK
    //    arrives, because the server processes our CREATE first and the ACK
    //    arrives before any remote DELETE that references our node.)
    if source == OpSource::Ours {
        let is_set_intent = op.intent.as_deref() == Some("set");
        let ack_key = (parent_id.clone(), parent_key.clone());

        if is_set_intent {
            let op_id = op.op_id.as_deref().unwrap_or("");
            let latest_op_id = doc.unacked_creates.get(&ack_key).map(|s| s.as_str());

            if latest_op_id == Some(op_id) {
                // This is the current (non-superseded) set — remove from tracking
                // and fall through to create the node normally.
                doc.unacked_creates.remove(&ack_key);
            } else {
                // Superseded: a more recent local set at this (parent, key) has
                // overwritten this one → skip the ACK.
                return ApplyResult::NotModified;
            }
        } else {
            // Non-set-intent ACK (push, insert, undo-CREATE).
            // Check unacked_creates for map/object ACKs (tracked by handles.rs).
            let op_id = op.op_id.as_deref().unwrap_or("");
            let latest_op_id = doc.unacked_creates.get(&ack_key).map(|s| s.as_str());
            if latest_op_id.is_some() && latest_op_id != Some(op_id) {
                // There's a newer local create at this (parent, key) — skip ACK.
                return ApplyResult::NotModified;
            }
            if latest_op_id == Some(op_id) {
                doc.unacked_creates.remove(&ack_key);
            }
            // Fall through to create the node normally (matching JS behavior
            // where ACKs are processed like regular ops).
        }
    }

    // Track local set-intent CREATE ops for unacked set detection.
    // When a later CREATE at the same (parent, key) overwrites this entry,
    // the earlier op becomes "superseded" and its ACK will be skipped.
    // Only set-intent ops are tracked — regular inserts, pushes, and
    // undo-generated CREATEs don't have superseded-set semantics.
    if source == OpSource::Local && op.intent.as_deref() == Some("set") {
        if let Some(op_id) = &op.op_id {
            doc.unacked_creates.insert(
                (parent_id.clone(), parent_key.clone()),
                op_id.clone(),
            );
        }
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
            attach_child_to_list(doc, parent_node_key, &parent_id, &parent_key, op, source)
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

/// If the op is CREATE_OBJECT with inline data, populate register children
/// on the newly created node. This must be called after inserting the node
/// into the document.
fn populate_inline_data(doc: &mut Document, child_key: NodeKey, op: &Op) {
    if op.op_code == OpCode::CreateObject {
        if let Some(Json::Object(data)) = &op.data {
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
    }
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
        doc.remove_node_recursive(old_ck);
    }

    // Create and insert the new child
    let child_node = node_from_create_op(op);
    let child_key = doc.insert_node(child_node);

    // If CREATE_OBJECT with inline data, populate register children
    populate_inline_data(doc, child_key, op);

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
    source: OpSource,
) -> ApplyResult {
    let is_set_intent = op.intent.as_deref() == Some("set");
    // Track the actual insertion position (may be shifted for LOCAL source conflicts)
    let mut actual_position = position.to_string();

    // For set intent, capture CREATE ops for the conflict item BEFORE removing it.
    // This is needed so undo/redo can restore the replaced item.
    // Matches JS LiveList.#applySetUndoRedo which builds reverse from existingItem._toOps().
    let mut conflict_reverse_ops: Vec<Op> = vec![];

    if is_set_intent {
        // Handle intent: "set" — this is a "replace" operation.
        // Matches JS LiveList._applySetRemote behavior:
        // 1. Remove any existing item at the target position (conflict resolution)
        // 2. Remove the deleted_id item (the item being replaced)
        // 3. Insert the new item at the target position
        // If the item at the position IS the deleted_id item, step 2 is a no-op.

        // Step 1: Remove item at target position if one exists
        let conflict_key = doc.get_node(parent_key).and_then(|n| match &n.data {
            CrdtData::List { children, .. } => {
                children.iter().find(|(pos, _)| pos.as_str() == position).map(|(_, ck)| *ck)
            }
            _ => None,
        });
        if let Some(ck) = conflict_key {
            // Capture CREATE ops for the conflict item before removing it
            conflict_reverse_ops = generate_create_ops_for_subtree(doc, ck);
            // Add intent "set" and deleted_id to the first reverse op
            // (matching JS HACK_addIntentAndDeletedIdToOperation)
            if let Some(first) = conflict_reverse_ops.first_mut() {
                first.intent = Some("set".to_string());
                first.deleted_id = Some(op.id.clone());
            }

            // Check if this conflict item is the same as the deleted_id
            let conflict_is_deleted_id = op.deleted_id.as_ref().map_or(false, |did| {
                doc.get_node(ck).map_or(false, |n| n.id == *did)
            });

            // Remove from list's children
            if let Some(parent) = doc.get_node_mut(parent_key)
                && let CrdtData::List { children, .. } = &mut parent.data
            {
                children.retain(|(_, c)| *c != ck);
            }

            if conflict_is_deleted_id {
                // Normal case: the conflict item IS the one being replaced → fully remove
                doc.remove_node_recursive(ck);
            } else {
                // Implicit delete: the conflict item was locally moved here but
                // the remote set didn't know about it.
                // Keep the node in the document arena (don't remove it) so that
                // a later SET_PARENT_KEY ACK can restore it.
                // Matches JS LiveList.#implicitlyDeletedItems behavior.
            }
        }

        // Step 2: Remove deleted_id item (may have been already removed in step 1)
        if let Some(deleted_id) = &op.deleted_id {
            if let Some(deleted_node_key) = doc.get_key_by_id(deleted_id) {
                if let Some(parent) = doc.get_node_mut(parent_key)
                    && let CrdtData::List { children, .. } = &mut parent.data
                {
                    children.retain(|(_, ck)| *ck != deleted_node_key);
                }
                doc.remove_node_recursive(deleted_node_key);
            }
        }
    } else {
        // Regular insert (not set): resolve position conflicts by shifting.
        if let Some(node) = doc.get_node(parent_key)
            && let CrdtData::List { children, .. } = &node.data
        {
            if let Some(conflict_idx) = children.iter().position(|(pos, _)| pos.as_str() == position) {
                match source {
                    OpSource::Theirs => {
                        // Remote insert: shift the EXISTING item to make room.
                        // Matches JS LiveList.#applyRemoteInsert → #shiftItemPosition.
                        let conflict_child_key = children[conflict_idx].1;
                        let before_pos = Some(position.to_string());
                        let after_pos = children.get(conflict_idx + 1).map(|(pos, _)| pos.clone());
                        let shifted_pos = crate::position::make_position(
                            before_pos.as_deref(),
                            after_pos.as_deref(),
                        );
                        if let Some(child) = doc.get_node_mut(conflict_child_key) {
                            child.parent_key = Some(shifted_pos.clone());
                        }
                        if let Some(parent) = doc.get_node_mut(parent_key)
                            && let CrdtData::List { children, .. } = &mut parent.data
                        {
                            if let Some(entry) = children.iter_mut().find(|(_, ck)| *ck == conflict_child_key) {
                                entry.0 = shifted_pos;
                            }
                            children.sort_by(|(a, _), (b, _)| a.cmp(b));
                        }
                    }
                    _ => {
                        // Local/undo-redo insert: shift the NEW item to AFTER the conflict.
                        // Matches JS LiveList.#applyInsertUndoRedo behavior.
                        let before_pos = Some(position.to_string());
                        let after_pos = children.get(conflict_idx + 1).map(|(pos, _)| pos.clone());
                        let shifted_pos = crate::position::make_position(
                            before_pos.as_deref(),
                            after_pos.as_deref(),
                        );
                        actual_position = shifted_pos;
                    }
                }
            }
        }
    }

    // Create and insert the new child
    let mut child_node = node_from_create_op(op);
    // Update the child's parent_key to the actual position (may differ from op's position)
    child_node.parent_key = Some(actual_position.clone());
    let child_key = doc.insert_node(child_node);

    // If CREATE_OBJECT with inline data, populate register children
    populate_inline_data(doc, child_key, op);

    // Insert into the list's children at the correct sorted position
    if let Some(node) = doc.get_node_mut(parent_key)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        let insert_idx = children
            .iter()
            .position(|(pos, _)| pos.as_str() > actual_position.as_str())
            .unwrap_or(children.len());
        children.insert(insert_idx, (actual_position.clone(), child_key));

        // Determine update type based on whether this was a set or insert
        let updates = if is_set_intent && !conflict_reverse_ops.is_empty() {
            vec![ListUpdateEntry::Set {
                index: insert_idx,
                old_value: Some(Json::Null),
                new_value: Json::Null,
            }]
        } else {
            vec![ListUpdateEntry::Insert {
                index: insert_idx,
                value: Json::Null, // Placeholder
            }]
        };

        // Use conflict reverse ops if we replaced an existing item (set intent),
        // otherwise use simple DELETE_CRDT
        let reverse = if !conflict_reverse_ops.is_empty() {
            conflict_reverse_ops
        } else {
            vec![Op {
                op_code: OpCode::DeleteCrdt,
                id: op.id.clone(),
                op_id: None,
                parent_id: None,
                parent_key: None,
                data: None,
                intent: None,
                deleted_id: None,
                key: None,
            }]
        };

        ApplyResult::Modified {
            reverse,
            update: StorageUpdate::LiveListUpdate {
                node_id: parent_id.to_string(),
                updates,
            },
        }
    } else {
        // Parent is not a list (shouldn't happen)
        doc.remove_node_recursive(child_key);
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
    let mut reverse = build_reverse_for_map_key(doc, parent_key, parent_id, map_key);

    // If there was no existing child, reverse is DELETE_CRDT of the new node
    let had_existing_child = reverse.len() > 0;

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
        doc.remove_node_recursive(old_ck);
    }

    // Create and insert the new child
    let child_node = node_from_create_op(op);
    let child_key = doc.insert_node(child_node);

    // If CREATE_OBJECT with inline data, populate register children
    populate_inline_data(doc, child_key, op);

    // Insert into map's children
    if let Some(node) = doc.get_node_mut(parent_key)
        && let CrdtData::Map { children, .. } = &mut node.data
    {
        children.insert(map_key.to_string(), child_key);
    }

    // If there was no existing child, the reverse is DELETE_CRDT of the new node
    if !had_existing_child {
        reverse = vec![crate::ops::serialize::delete_crdt_op(&op.id)];
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
fn apply_delete_crdt(doc: &mut Document, op: &Op, _source: OpSource) -> ApplyResult {
    let node_key = match doc.get_key_by_id(&op.id) {
        Some(k) => k,
        None => return ApplyResult::NotModified,
    };

    // Get the node's parent info
    let (parent_id, parent_key_str, deleted_node_id) = {
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

    // Capture the old value BEFORE deleting (for update notifications)
    let old_value = get_node_immutable_value(doc, node_key);

    // Determine the parent's type and, for lists, the child's index
    let parent_node_key = parent_id
        .as_ref()
        .and_then(|pid| doc.get_key_by_id(pid));

    #[derive(Clone, Copy)]
    enum ParentKind {
        Object,
        List,
        Map,
    }

    let (parent_kind, list_index) = if let Some(pk) = parent_node_key {
        if let Some(parent) = doc.get_node(pk) {
            match &parent.data {
                CrdtData::List { children, .. } => {
                    let idx = children
                        .iter()
                        .position(|(_, ck)| *ck == node_key)
                        .unwrap_or(0);
                    (ParentKind::List, idx)
                }
                CrdtData::Map { .. } => (ParentKind::Map, 0),
                _ => (ParentKind::Object, 0),
            }
        } else {
            (ParentKind::Object, 0)
        }
    } else {
        (ParentKind::Object, 0)
    };

    // Generate reverse ops (CREATE ops to recreate the subtree)
    let reverse = generate_create_ops_for_subtree(doc, node_key);

    // Find and update the parent to remove this child
    if let Some(pk) = parent_node_key {
        remove_child_from_parent(doc, pk, &parent_key_str, node_key);
    }

    // Remove the node (and recursively remove its children)
    remove_node_recursive(doc, node_key);

    let parent_nid = parent_id.unwrap_or_default();
    let pkey = parent_key_str.unwrap_or_default();
    let old_val = old_value.unwrap_or(Json::Null);

    let update = match parent_kind {
        ParentKind::List => StorageUpdate::LiveListUpdate {
            node_id: parent_nid,
            updates: vec![ListUpdateEntry::Delete {
                index: list_index,
                old_value: old_val,
            }],
        },
        ParentKind::Map => {
            let mut updates = HashMap::new();
            updates.insert(pkey, UpdateDelta::Delete { old_value: old_val, deleted_id: Some(deleted_node_id.clone()) });
            StorageUpdate::LiveMapUpdate {
                node_id: parent_nid,
                updates,
            }
        }
        ParentKind::Object => {
            let mut updates = HashMap::new();
            updates.insert(pkey, UpdateDelta::Delete { old_value: old_val, deleted_id: Some(deleted_node_id.clone()) });
            StorageUpdate::LiveObjectUpdate {
                node_id: parent_nid,
                updates,
            }
        }
    };

    ApplyResult::Modified { reverse, update }
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

    // If the position is already at the target, no-op
    if old_parent_key.as_deref() == Some(&new_parent_key) {
        return ApplyResult::NotModified;
    }

    // Update the node's parent_key
    if let Some(node) = doc.get_node_mut(node_key) {
        node.parent_key = Some(new_parent_key.clone());
    }

    // If the parent is a list, update the position and re-sort
    enum ListChangeKind {
        Move { previous_index: usize, new_index: usize },
        Restore { new_index: usize },
        None,
    }
    let mut list_change = ListChangeKind::None;

    if let Some(pid) = &parent_id
        && let Some(parent_node_key) = doc.get_key_by_id(pid)
    {
        // Check if node is currently in the list's children
        let previous_index = {
            let parent = doc.get_node(parent_node_key);
            parent.and_then(|p| match &p.data {
                CrdtData::List { children, .. } => {
                    children.iter().position(|(_, ck)| *ck == node_key)
                }
                _ => None,
            })
        };

        // Check if parent is a list
        let is_list = doc.get_node(parent_node_key).map_or(false, |p| {
            matches!(&p.data, CrdtData::List { .. })
        });

        if is_list {
            if let Some(_prev_idx) = previous_index {
                // Normal case: node is in the list, update position
                if let Some(parent) = doc.get_node_mut(parent_node_key)
                    && let CrdtData::List { children, .. } = &mut parent.data
                {
                    if let Some(entry) = children.iter_mut().find(|(_, ck)| *ck == node_key) {
                        entry.0 = new_parent_key.clone();
                    }
                    children.sort_by(|(a, _), (b, _)| a.cmp(b));

                    let new_index = children.iter().position(|(_, ck)| *ck == node_key);
                    if let Some(new_idx) = new_index {
                        if _prev_idx != new_idx {
                            list_change = ListChangeKind::Move {
                                previous_index: _prev_idx,
                                new_index: new_idx,
                            };
                        }
                    }
                }
            } else {
                // Implicitly deleted: node exists in document but NOT in parent's children.
                // Restore it by re-inserting at the new position.
                // Matches JS LiveList.#applySetChildKeyAck restoring from implicitlyDeletedItems.

                // First, shift any existing item at the target position
                // (matching JS: existingItem._setParentLink(this, makePosition(newKey, nextPos)))
                if let Some(parent) = doc.get_node(parent_node_key)
                    && let CrdtData::List { children, .. } = &parent.data
                {
                    if let Some(conflict_idx) = children
                        .iter()
                        .position(|(pos, _)| pos.as_str() == new_parent_key.as_str())
                    {
                        let conflict_child_key = children[conflict_idx].1;
                        let before_pos = Some(new_parent_key.clone());
                        let after_pos =
                            children.get(conflict_idx + 1).map(|(pos, _)| pos.clone());
                        let shifted_pos = crate::position::make_position(
                            before_pos.as_deref(),
                            after_pos.as_deref(),
                        );
                        if let Some(child) = doc.get_node_mut(conflict_child_key) {
                            child.parent_key = Some(shifted_pos.clone());
                        }
                        if let Some(parent) = doc.get_node_mut(parent_node_key)
                            && let CrdtData::List { children, .. } = &mut parent.data
                        {
                            if let Some(entry) =
                                children.iter_mut().find(|(_, ck)| *ck == conflict_child_key)
                            {
                                entry.0 = shifted_pos;
                            }
                            children.sort_by(|(a, _), (b, _)| a.cmp(b));
                        }
                    }
                }

                // Now re-insert the restored node
                if let Some(parent) = doc.get_node_mut(parent_node_key)
                    && let CrdtData::List { children, .. } = &mut parent.data
                {
                    let insert_idx = children
                        .iter()
                        .position(|(pos, _)| pos.as_str() > new_parent_key.as_str())
                        .unwrap_or(children.len());
                    children.insert(insert_idx, (new_parent_key.clone(), node_key));
                    list_change = ListChangeKind::Restore { new_index: insert_idx };
                }
            }
        }
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

    // Build update entry based on what happened
    let updates = match list_change {
        ListChangeKind::Move { previous_index, new_index } => {
            let value = get_node_immutable_value(doc, node_key).unwrap_or(Json::Null);
            vec![ListUpdateEntry::Move {
                previous_index,
                new_index,
                value,
            }]
        }
        ListChangeKind::Restore { new_index } => {
            let value = get_node_immutable_value(doc, node_key).unwrap_or(Json::Null);
            vec![ListUpdateEntry::Insert {
                index: new_index,
                value,
            }]
        }
        ListChangeKind::None => vec![],
    };

    // If we restored an item from implicit delete, always return Modified
    let is_restored = matches!(list_change, ListChangeKind::Restore { .. });
    if updates.is_empty() && !is_restored {
        // No actual change in the list
        ApplyResult::Modified {
            reverse,
            update: StorageUpdate::LiveListUpdate {
                node_id: parent_nid,
                updates,
            },
        }
    } else {
        ApplyResult::Modified {
            reverse,
            update: StorageUpdate::LiveListUpdate {
                node_id: parent_nid,
                updates,
            },
        }
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
pub fn generate_create_ops_for_subtree(doc: &Document, node_key: NodeKey) -> Vec<Op> {
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
    doc.remove_node_recursive(node_key);
}

/// Get the immutable value of a node before it is deleted.
/// For registers, returns the stored data directly.
/// For CRDT containers, returns a recursive immutable snapshot.
fn get_node_immutable_value(doc: &Document, key: NodeKey) -> Option<Json> {
    let node = doc.get_node(key)?;
    match &node.data {
        CrdtData::Register { data } => Some(data.clone()),
        CrdtData::Object { .. } => crate::crdt::object::to_immutable(doc, key),
        CrdtData::List { .. } => crate::crdt::list::to_immutable(doc, key),
        CrdtData::Map { .. } => crate::crdt::map::to_immutable(doc, key),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_init_op() -> Op {
        Op {
            op_code: OpCode::Init,
            id: "root".to_string(),
            op_id: None,
            parent_id: None,
            parent_key: None,
            data: None,
            intent: None,
            deleted_id: None,
            key: None,
        }
    }

    fn make_create_map_op(id: &str, parent_id: &str, parent_key: &str) -> Op {
        Op {
            op_code: OpCode::CreateMap,
            id: id.to_string(),
            op_id: None,
            parent_id: Some(parent_id.to_string()),
            parent_key: Some(parent_key.to_string()),
            data: None,
            intent: None,
            deleted_id: None,
            key: None,
        }
    }

    fn make_create_register_op(
        id: &str,
        parent_id: &str,
        parent_key: &str,
        value: Json,
        op_id: Option<&str>,
    ) -> Op {
        Op {
            op_code: OpCode::CreateRegister,
            id: id.to_string(),
            op_id: op_id.map(String::from),
            parent_id: Some(parent_id.to_string()),
            parent_key: Some(parent_key.to_string()),
            data: Some(value),
            intent: None,
            deleted_id: None,
            key: None,
        }
    }

    /// Simulates: "remote set conflicts with another set" for LiveMap.
    /// Client B sets map["key"]="b" (Local), then client A's set arrives (Theirs),
    /// then B's ACK arrives (Ours). B should end up with map["key"]="b".
    #[test]
    fn map_set_conflict_ack_restores_value() {
        let mut doc = Document::new();

        // Init root + create a LiveMap at root.map
        apply_op(&mut doc, &make_init_op(), OpSource::Theirs);
        apply_op(
            &mut doc,
            &make_create_map_op("map1", "root", "map"),
            OpSource::Theirs,
        );

        // Step 1: Client B sets map["key"]="b" (Local mutation).
        // In WASM-owned mode, the WASM mutation handle (handles.rs::mapSet):
        //   1. Pre-creates the register via map::set_with_id
        //   2. Tracks unacked_creates directly
        //   3. Dispatches the op (not through apply_create)
        // Here we simulate by applying the create op + manually tracking,
        // matching the real handles.rs flow.
        let b_op = make_create_register_op(
            "reg_b",
            "map1",
            "key",
            Json::String("b".to_string()),
            Some("op_b"),
        );
        let result = apply_op(&mut doc, &b_op, OpSource::Local);
        assert!(matches!(result, ApplyResult::Modified { .. }));

        // Simulate handles.rs tracking (mapSet tracks unacked_creates directly)
        let ack_key = ("map1".to_string(), "key".to_string());
        doc.unacked_creates.insert(ack_key.clone(), "op_b".to_string());

        // Verify the map has key="b"
        let map_key = doc.get_key_by_id("map1").unwrap();

        // Step 2: Client A's set arrives (Theirs) — overwrites B's value.
        let a_op = make_create_register_op(
            "reg_a",
            "map1",
            "key",
            Json::String("a".to_string()),
            Some("op_a"),
        );
        let result = apply_op(&mut doc, &a_op, OpSource::Theirs);
        assert!(matches!(result, ApplyResult::Modified { .. }));

        // Verify the map now has key="a" (A's value)
        let map_val = crate::crdt::map::get(&doc, map_key, "key");
        assert_eq!(map_val, Some(Json::String("a".to_string())));

        // B's register should have been removed from the arena
        assert!(doc.get_key_by_id("reg_b").is_none());

        // unacked_creates should still be present (not cleared by A's op)
        assert_eq!(
            doc.unacked_creates.get(&ack_key),
            Some(&"op_b".to_string()),
            "unacked_creates should survive remote ops"
        );

        // Step 3: B's ACK arrives (Ours) — should re-create B's value.
        let result = apply_op(&mut doc, &b_op, OpSource::Ours);
        assert!(
            matches!(result, ApplyResult::Modified { .. }),
            "B's ACK should re-create the value (not be treated as superseded)"
        );

        // Verify the map now has key="b" (B's value restored)
        let map_val = crate::crdt::map::get(&doc, map_key, "key");
        assert_eq!(
            map_val,
            Some(Json::String("b".to_string())),
            "After B's ACK, map should have B's value"
        );

        // unacked_creates should be cleared
        assert!(
            doc.unacked_creates.get(&ack_key).is_none(),
            "unacked_creates should be cleared after ACK"
        );
    }

    /// Simulates: superseded set ACK should be skipped.
    /// Client B sets map["key"]="b1" (Local), then sets map["key"]="b2" (Local),
    /// then b1's ACK arrives (Ours) — should be skipped.
    #[test]
    fn map_set_superseded_ack_is_skipped() {
        let mut doc = Document::new();

        // Init root + create a LiveMap
        apply_op(&mut doc, &make_init_op(), OpSource::Theirs);
        apply_op(
            &mut doc,
            &make_create_map_op("map1", "root", "map"),
            OpSource::Theirs,
        );

        // B sets map["key"]="b1"
        // (handles.rs::mapSet pre-creates + tracks unacked_creates)
        let b1_op = make_create_register_op(
            "reg_b1",
            "map1",
            "key",
            Json::String("b1".to_string()),
            Some("op_b1"),
        );
        apply_op(&mut doc, &b1_op, OpSource::Local);
        let ack_key = ("map1".to_string(), "key".to_string());
        doc.unacked_creates.insert(ack_key.clone(), "op_b1".to_string());

        // B sets map["key"]="b2" (overwrites b1)
        // (handles.rs::mapSet overwrites the unacked_creates entry)
        let b2_op = make_create_register_op(
            "reg_b2",
            "map1",
            "key",
            Json::String("b2".to_string()),
            Some("op_b2"),
        );
        apply_op(&mut doc, &b2_op, OpSource::Local);
        doc.unacked_creates.insert(ack_key.clone(), "op_b2".to_string());

        // Verify map has key="b2"
        let map_key = doc.get_key_by_id("map1").unwrap();
        let map_val = crate::crdt::map::get(&doc, map_key, "key");
        assert_eq!(map_val, Some(Json::String("b2".to_string())));

        // b1's ACK arrives — should be skipped (superseded by b2)
        let result = apply_op(&mut doc, &b1_op, OpSource::Ours);
        assert!(
            matches!(result, ApplyResult::NotModified),
            "Superseded ACK should return NotModified"
        );

        // Map should still have key="b2"
        let map_val = crate::crdt::map::get(&doc, map_key, "key");
        assert_eq!(map_val, Some(Json::String("b2".to_string())));
    }

    /// Simulates the WASM-owned flow where the WASM mutation handle pre-creates
    /// the node before apply_create is called with source=Local.
    /// This is the actual path in WASM-owned mode.
    #[test]
    fn map_set_conflict_wasm_owned_flow() {
        let mut doc = Document::new();

        // Init root + create a LiveMap
        apply_op(&mut doc, &make_init_op(), OpSource::Theirs);
        apply_op(
            &mut doc,
            &make_create_map_op("map1", "root", "map"),
            OpSource::Theirs,
        );
        let map_key = doc.get_key_by_id("map1").unwrap();

        // Step 1: Simulate WASM mutation handle pre-creating the register.
        // In real WASM-owned mode, mapSet() calls:
        //   1. map::set_with_id() — creates the register node
        //   2. doc.unacked_creates.insert() — tracks for ACK resolution
        //   3. dispatch(ops) — sends to server (NOT through apply_create)
        crate::crdt::map::set_with_id(
            &mut doc,
            map_key,
            "key",
            Json::String("b".to_string()),
            "reg_b",
        );
        let ack_key = ("map1".to_string(), "key".to_string());
        doc.unacked_creates.insert(ack_key.clone(), "op_b".to_string());

        // In the real flow, the op is dispatched to the server without going
        // through apply_create. We verify unacked_creates was populated.
        assert_eq!(
            doc.unacked_creates.get(&ack_key),
            Some(&"op_b".to_string()),
            "unacked_creates should be populated by the mutation handle"
        );

        let b_op = make_create_register_op(
            "reg_b",
            "map1",
            "key",
            Json::String("b".to_string()),
            Some("op_b"),
        );

        // Step 2: Client A's set arrives (Theirs)
        let a_op = make_create_register_op(
            "reg_a",
            "map1",
            "key",
            Json::String("a".to_string()),
            Some("op_a"),
        );
        apply_op(&mut doc, &a_op, OpSource::Theirs);

        // Verify map has key="a"
        let map_val = crate::crdt::map::get(&doc, map_key, "key");
        assert_eq!(map_val, Some(Json::String("a".to_string())));

        // B's register was removed
        assert!(doc.get_key_by_id("reg_b").is_none());

        // Step 3: B's ACK arrives (Ours)
        let result = apply_op(&mut doc, &b_op, OpSource::Ours);
        assert!(
            matches!(result, ApplyResult::Modified { .. }),
            "B's ACK should re-create the value"
        );

        // Verify map has key="b"
        let map_val = crate::crdt::map::get(&doc, map_key, "key");
        assert_eq!(
            map_val,
            Some(Json::String("b".to_string())),
            "After B's ACK, map should have B's value 'b'"
        );
    }

    // ---- List push/undo/redo ACK tests ----

    fn make_create_list_op(id: &str, parent_id: &str, parent_key: &str) -> Op {
        Op {
            op_code: OpCode::CreateList,
            id: id.to_string(),
            op_id: None,
            parent_id: Some(parent_id.to_string()),
            parent_key: Some(parent_key.to_string()),
            data: None,
            intent: None,
            deleted_id: None,
            key: None,
        }
    }

    fn make_delete_crdt_op(id: &str, op_id: Option<&str>) -> Op {
        Op {
            op_code: OpCode::DeleteCrdt,
            id: id.to_string(),
            op_id: op_id.map(String::from),
            parent_id: None,
            parent_key: None,
            data: None,
            intent: None,
            deleted_id: None,
            key: None,
        }
    }

    /// Reproduces the shrunk counterexample from the property test:
    /// A.push("PO"), A.undo(), A.redo(), A.move(0,0), B.undo(), B.undo(), A.undo()
    /// Expected: both clients = [], Actual in WASM: A=[], B=["PO"]
    ///
    /// Client A dispatches 4 ops (all buffered until flush):
    ///   OP1: CREATE_REGISTER R_PO (push)
    ///   OP2: DELETE_CRDT R_PO (undo)
    ///   OP3: CREATE_REGISTER R_PO (redo, same node ID, new opId)
    ///   OP4: DELETE_CRDT R_PO (final undo)
    ///
    /// Client A receives these back as ACKs (source=Ours).
    /// Client B receives them as THEIRS (no opIds).
    /// Both should end up with an empty list.
    #[test]
    fn push_undo_redo_undo_ack_should_not_recreate() {
        // Simulate Client A
        let mut doc_a = Document::new();
        apply_op(&mut doc_a, &make_init_op(), OpSource::Theirs);
        apply_op(
            &mut doc_a,
            &make_create_list_op("list1", "root", "items"),
            OpSource::Theirs,
        );
        let list_key_a = doc_a.get_key_by_id("list1").unwrap();
        let pos1 = crate::position::make_position(None, None);

        // Step 1: A.push("PO") — local mutation
        let create_op = make_create_register_op(
            "reg_po",
            "list1",
            &pos1,
            Json::String("PO".to_string()),
            Some("op1"),
        );
        let result = apply_op(&mut doc_a, &create_op, OpSource::Local);
        assert!(matches!(result, ApplyResult::Modified { .. }));
        assert_eq!(crate::crdt::list::length(&doc_a, list_key_a), 1);

        // Step 2: A.undo() — apply DELETE_CRDT locally
        let delete_op1 = make_delete_crdt_op("reg_po", Some("op2"));
        let result = apply_op(&mut doc_a, &delete_op1, OpSource::Local);
        assert!(matches!(result, ApplyResult::Modified { .. }));
        assert_eq!(crate::crdt::list::length(&doc_a, list_key_a), 0);

        // Step 3: A.redo() — apply CREATE_REGISTER locally (same node ID, new opId)
        let create_op2 = make_create_register_op(
            "reg_po",
            "list1",
            &pos1,
            Json::String("PO".to_string()),
            Some("op3"),
        );
        let result = apply_op(&mut doc_a, &create_op2, OpSource::Local);
        assert!(matches!(result, ApplyResult::Modified { .. }));
        assert_eq!(crate::crdt::list::length(&doc_a, list_key_a), 1);

        // Step 4: A.undo() — apply DELETE_CRDT locally
        let delete_op2 = make_delete_crdt_op("reg_po", Some("op4"));
        let result = apply_op(&mut doc_a, &delete_op2, OpSource::Local);
        assert!(matches!(result, ApplyResult::Modified { .. }));
        assert_eq!(
            crate::crdt::list::length(&doc_a, list_key_a),
            0,
            "A should be empty after final undo"
        );

        // Now A receives ACKs from the server (source=Ours)
        let ack_result1 = apply_op(&mut doc_a, &create_op, OpSource::Ours);
        eprintln!("ACK1 (CREATE op1): {:?}", matches!(&ack_result1, ApplyResult::Modified { .. }));

        let ack_result2 = apply_op(&mut doc_a, &delete_op1, OpSource::Ours);
        eprintln!("ACK2 (DELETE op2): {:?}", matches!(&ack_result2, ApplyResult::Modified { .. }));

        let ack_result3 = apply_op(&mut doc_a, &create_op2, OpSource::Ours);
        eprintln!("ACK3 (CREATE op3): {:?}", matches!(&ack_result3, ApplyResult::Modified { .. }));

        let ack_result4 = apply_op(&mut doc_a, &delete_op2, OpSource::Ours);
        eprintln!("ACK4 (DELETE op4): {:?}", matches!(&ack_result4, ApplyResult::Modified { .. }));

        // After processing all ACKs, A should still be empty
        assert_eq!(
            crate::crdt::list::length(&doc_a, list_key_a),
            0,
            "A should be empty after processing all ACKs"
        );

        // Now simulate Client B — receives all 4 ops as THEIRS (no opIds)
        let mut doc_b = Document::new();
        apply_op(&mut doc_b, &make_init_op(), OpSource::Theirs);
        apply_op(
            &mut doc_b,
            &make_create_list_op("list1", "root", "items"),
            OpSource::Theirs,
        );
        let list_key_b = doc_b.get_key_by_id("list1").unwrap();

        // Strip opIds for B (server strips them for non-originator)
        let b_create1 = Op {
            op_id: None,
            ..create_op.clone()
        };
        let b_delete1 = Op {
            op_id: None,
            ..delete_op1.clone()
        };
        let b_create2 = Op {
            op_id: None,
            ..create_op2.clone()
        };
        let b_delete2 = Op {
            op_id: None,
            ..delete_op2.clone()
        };

        let r1 = apply_op(&mut doc_b, &b_create1, OpSource::Theirs);
        eprintln!("B op1 (CREATE): {:?}", matches!(&r1, ApplyResult::Modified { .. }));
        eprintln!("  B list length = {}", crate::crdt::list::length(&doc_b, list_key_b));

        let r2 = apply_op(&mut doc_b, &b_delete1, OpSource::Theirs);
        eprintln!("B op2 (DELETE): {:?}", matches!(&r2, ApplyResult::Modified { .. }));
        eprintln!("  B list length = {}", crate::crdt::list::length(&doc_b, list_key_b));

        let r3 = apply_op(&mut doc_b, &b_create2, OpSource::Theirs);
        eprintln!("B op3 (CREATE): {:?}", matches!(&r3, ApplyResult::Modified { .. }));
        eprintln!("  B list length = {}", crate::crdt::list::length(&doc_b, list_key_b));

        let r4 = apply_op(&mut doc_b, &b_delete2, OpSource::Theirs);
        eprintln!("B op4 (DELETE): {:?}", matches!(&r4, ApplyResult::Modified { .. }));
        eprintln!("  B list length = {}", crate::crdt::list::length(&doc_b, list_key_b));

        // After processing all ops, B should be empty
        assert_eq!(
            crate::crdt::list::length(&doc_b, list_key_b),
            0,
            "B should be empty after processing CREATE, DELETE, CREATE, DELETE"
        );
    }
}
