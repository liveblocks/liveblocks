// Reverse op generation helpers.
//
// `compute_reverse_ops` computes the reverse of an op *before* it is applied,
// so that undo/redo can capture the "undo of the undo" (i.e. the redo ops).

use std::collections::BTreeMap;

use crate::crdt::node::CrdtData;
use crate::crdt::object;
use crate::document::Document;
use crate::ops::apply::generate_create_ops_for_subtree;
use crate::types::{Op, OpCode};

/// Compute the reverse ops for `op` given the current document state.
/// Must be called BEFORE `op` is applied. Returns a Vec<Op> that, when applied,
/// would undo the effect of `op`.
pub fn compute_reverse_ops(doc: &Document, op: &Op) -> Vec<Op> {
    match op.op_code {
        OpCode::UpdateObject => reverse_update_object(doc, op),
        OpCode::DeleteObjectKey => reverse_delete_object_key(doc, op),
        OpCode::CreateObject | OpCode::CreateList | OpCode::CreateMap | OpCode::CreateRegister => {
            reverse_create(doc, op)
        }
        OpCode::DeleteCrdt => reverse_delete_crdt(doc, op),
        OpCode::SetParentKey => reverse_set_parent_key(doc, op),
        OpCode::Init => vec![],
    }
}

/// Reverse of UpdateObject: restore old values for each key being updated.
fn reverse_update_object(doc: &Document, op: &Op) -> Vec<Op> {
    let Some(node_key) = doc.get_key_by_id(&op.id) else {
        return vec![];
    };

    let patch_keys: Vec<String> = match &op.data {
        Some(crate::types::Json::Object(map)) => map.keys().cloned().collect(),
        _ => return vec![],
    };

    let mut old_values = BTreeMap::new();
    let mut delete_keys = Vec::new();
    let mut crdt_recreate_ops = Vec::new();

    for key in &patch_keys {
        if let Some(old_val) = object::get_plain(doc, node_key, key) {
            // Key holds a plain scalar value → reverse restores it
            old_values.insert(key.clone(), old_val.clone());
        } else if let Some(child_key) = object::get_child(doc, node_key, key) {
            // Check if the child is a non-register CRDT node
            let is_register = doc
                .get_node(child_key)
                .map(|n| matches!(&n.data, CrdtData::Register { .. }))
                .unwrap_or(true);
            if !is_register {
                // Key holds a CRDT child (LiveObject, LiveList, LiveMap)
                // → reverse recreates the subtree
                crdt_recreate_ops.extend(generate_create_ops_for_subtree(doc, child_key));
            } else {
                // Key doesn't exist as a meaningful value → reverse should delete it
                delete_keys.push(Op {
                    op_code: OpCode::DeleteObjectKey,
                    id: op.id.clone(),
                    op_id: None,
                    parent_id: None,
                    parent_key: None,
                    data: None,
                    intent: None,
                    deleted_id: None,
                    key: Some(key.clone()),
                });
            }
        } else {
            // Key doesn't exist yet → reverse should delete it
            delete_keys.push(Op {
                op_code: OpCode::DeleteObjectKey,
                id: op.id.clone(),
                op_id: None,
                parent_id: None,
                parent_key: None,
                data: None,
                intent: None,
                deleted_id: None,
                key: Some(key.clone()),
            });
        }
    }

    let mut result = Vec::new();
    if !old_values.is_empty() {
        result.push(Op {
            op_code: OpCode::UpdateObject,
            id: op.id.clone(),
            op_id: None,
            parent_id: None,
            parent_key: None,
            data: Some(crate::types::Json::Object(old_values)),
            intent: None,
            deleted_id: None,
            key: None,
        });
    }
    result.extend(delete_keys);
    result.extend(crdt_recreate_ops);
    result
}

/// Reverse of DeleteObjectKey: restore the deleted value.
fn reverse_delete_object_key(doc: &Document, op: &Op) -> Vec<Op> {
    let Some(node_key) = doc.get_key_by_id(&op.id) else {
        return vec![];
    };
    let Some(key) = &op.key else {
        return vec![];
    };

    // Check if the key holds a plain value
    if let Some(old_val) = object::get_plain(doc, node_key, key) {
        let mut data = BTreeMap::new();
        data.insert(key.clone(), old_val.clone());
        return vec![Op {
            op_code: OpCode::UpdateObject,
            id: op.id.clone(),
            op_id: None,
            parent_id: None,
            parent_key: None,
            data: Some(crate::types::Json::Object(data)),
            intent: None,
            deleted_id: None,
            key: None,
        }];
    }

    // Check if the key holds a CRDT child
    if let Some(child_key) = object::get_child(doc, node_key, key) {
        return generate_create_ops_for_subtree(doc, child_key);
    }

    vec![]
}

/// Reverse of Create*: delete the created node and restore the old value
/// at the parent key (if any existed before the CREATE replaces it).
fn reverse_create(doc: &Document, op: &Op) -> Vec<Op> {
    let mut result = Vec::new();

    // If the CREATE op targets a parent key that currently holds a value,
    // the CREATE will replace it. The reverse must restore that old value.
    if let (Some(parent_id), Some(parent_key)) = (&op.parent_id, &op.parent_key) {
        if let Some(parent_node_key) = doc.get_key_by_id(parent_id) {
            if let Some(parent) = doc.get_node(parent_node_key) {
                match &parent.data {
                    CrdtData::Object { children, .. } => {
                        if let Some(child_key) = children.get(parent_key.as_str()) {
                            if let Some(child) = doc.get_node(*child_key) {
                                match &child.data {
                                    CrdtData::Register { data } => {
                                        // Old value is a scalar — reverse restores it
                                        let mut d = std::collections::BTreeMap::new();
                                        d.insert(parent_key.clone(), data.clone());
                                        result.push(Op {
                                            op_code: OpCode::UpdateObject,
                                            id: parent_id.clone(),
                                            op_id: None,
                                            parent_id: None,
                                            parent_key: None,
                                            data: Some(crate::types::Json::Object(d)),
                                            intent: None,
                                            deleted_id: None,
                                            key: None,
                                        });
                                    }
                                    _ => {
                                        // Old value is a CRDT child — reverse recreates it
                                        result.extend(
                                            generate_create_ops_for_subtree(doc, *child_key),
                                        );
                                    }
                                }
                            }
                        } else {
                            // No existing value at this key — reverse should delete the key
                            result.push(Op {
                                op_code: OpCode::DeleteObjectKey,
                                id: parent_id.clone(),
                                op_id: None,
                                parent_id: None,
                                parent_key: None,
                                data: None,
                                intent: None,
                                deleted_id: None,
                                key: Some(parent_key.clone()),
                            });
                        }
                    }
                    CrdtData::Map { children, .. } => {
                        // Map parent: if the key holds a DIFFERENT child, reverse
                        // recreates it and deletes the newly created node.
                        result.push(Op {
                            op_code: OpCode::DeleteCrdt,
                            id: op.id.clone(),
                            op_id: None,
                            parent_id: None,
                            parent_key: None,
                            data: None,
                            intent: None,
                            deleted_id: None,
                            key: None,
                        });
                        if let Some(child_key) = children.get(parent_key.as_str()) {
                            // Only recreate if the child is NOT the node being created
                            let child_is_self = doc
                                .get_node(*child_key)
                                .map(|n| n.id == op.id)
                                .unwrap_or(false);
                            if !child_is_self {
                                result.extend(
                                    generate_create_ops_for_subtree(doc, *child_key),
                                );
                            }
                        }
                    }
                    _ => {
                        // For list parents, just delete the created node
                        result.push(Op {
                            op_code: OpCode::DeleteCrdt,
                            id: op.id.clone(),
                            op_id: None,
                            parent_id: None,
                            parent_key: None,
                            data: None,
                            intent: None,
                            deleted_id: None,
                            key: None,
                        });
                    }
                }
            }
        }
    }

    // If no parent-specific reverse was generated, fall back to DeleteCrdt
    if result.is_empty() {
        result.push(Op {
            op_code: OpCode::DeleteCrdt,
            id: op.id.clone(),
            op_id: None,
            parent_id: None,
            parent_key: None,
            data: None,
            intent: None,
            deleted_id: None,
            key: None,
        });
    }

    result
}

/// Reverse of DeleteCrdt: recreate the deleted subtree.
fn reverse_delete_crdt(doc: &Document, op: &Op) -> Vec<Op> {
    let Some(node_key) = doc.get_key_by_id(&op.id) else {
        return vec![];
    };
    generate_create_ops_for_subtree(doc, node_key)
}

/// Reverse of SetParentKey: restore the old parent key.
fn reverse_set_parent_key(doc: &Document, op: &Op) -> Vec<Op> {
    let Some(node_key) = doc.get_key_by_id(&op.id) else {
        return vec![];
    };
    let node = match doc.get_node(node_key) {
        Some(n) => n,
        None => return vec![],
    };

    vec![Op {
        op_code: OpCode::SetParentKey,
        id: op.id.clone(),
        op_id: None,
        parent_id: None,
        parent_key: node.parent_key.clone(),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    }]
}
