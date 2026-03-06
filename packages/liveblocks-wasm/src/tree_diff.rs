use std::collections::HashMap;

use crate::types::{CrdtType, IdTuple, Op, OpCode, SerializedCrdt};

/// Compare two serialized snapshots and produce the ops to transform the current tree into the new tree.
///
/// This is the equivalent of `getTreesDiffOperations` in the TypeScript codebase.
///
/// The algorithm:
/// 1. Nodes in current but not in new → DELETE_CRDT
/// 2. Nodes in both with changed data → UPDATE_OBJECT (for Objects only)
/// 3. Nodes in both with changed parent_key → SET_PARENT_KEY
/// 4. Nodes in new but not in current → CREATE_* (based on type)
///
/// DELETE ops come before CREATE ops in the output to avoid conflicts.
pub fn get_trees_diff_operations(
    current: &[IdTuple<SerializedCrdt>],
    new_items: &[IdTuple<SerializedCrdt>],
) -> Vec<Op> {
    let current_map: HashMap<&str, &SerializedCrdt> = current
        .iter()
        .map(|(id, crdt)| (id.as_str(), crdt))
        .collect();
    let new_map: HashMap<&str, &SerializedCrdt> = new_items
        .iter()
        .map(|(id, crdt)| (id.as_str(), crdt))
        .collect();

    let mut ops = Vec::new();

    // 1. DELETE: nodes in current but not in new
    for (id, _crdt) in current {
        if !new_map.contains_key(id.as_str()) {
            ops.push(Op {
                op_code: OpCode::DeleteCrdt,
                id: id.clone(),
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

    // 2. UPDATE + SET_PARENT_KEY: nodes in both
    for (id, new_crdt) in new_items {
        if let Some(current_crdt) = current_map.get(id.as_str()) {
            // Check if object data changed
            if new_crdt.crdt_type == CrdtType::Object
                && current_crdt.crdt_type == CrdtType::Object
                && new_crdt.data != current_crdt.data
            {
                // Produce UPDATE_OBJECT with the new data
                ops.push(Op {
                    op_code: OpCode::UpdateObject,
                    id: id.clone(),
                    op_id: None,
                    parent_id: None,
                    parent_key: None,
                    data: new_crdt.data.clone(),
                    intent: None,
                    deleted_id: None,
                    key: None,
                });
            }

            // Check if parent_key changed
            if new_crdt.parent_key != current_crdt.parent_key {
                ops.push(Op {
                    op_code: OpCode::SetParentKey,
                    id: id.clone(),
                    op_id: None,
                    parent_id: None,
                    parent_key: new_crdt.parent_key.clone(),
                    data: None,
                    intent: None,
                    deleted_id: None,
                    key: None,
                });
            }
        }
    }

    // 3. CREATE: nodes in new but not in current
    for (id, new_crdt) in new_items {
        if current_map.contains_key(id.as_str()) {
            continue;
        }

        let op_code = match new_crdt.crdt_type {
            CrdtType::Object => OpCode::CreateObject,
            CrdtType::List => OpCode::CreateList,
            CrdtType::Map => OpCode::CreateMap,
            CrdtType::Register => OpCode::CreateRegister,
        };

        ops.push(Op {
            op_code,
            id: id.clone(),
            op_id: None,
            parent_id: new_crdt.parent_id.clone(),
            parent_key: new_crdt.parent_key.clone(),
            data: new_crdt.data.clone(),
            intent: None,
            deleted_id: None,
            key: None,
        });
    }

    ops
}
