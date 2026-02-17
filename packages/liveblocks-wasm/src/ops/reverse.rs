// Reverse op generation helpers.
//
// Most reverse ops are generated inline within the apply functions
// (see apply.rs). This module provides shared helper utilities
// for building common reverse op patterns.

use crate::types::{Op, OpCode};

/// Create a DELETE_CRDT reverse op (used as reverse of CREATE_*).
pub fn delete_crdt_reverse(id: &str) -> Op {
    Op {
        op_code: OpCode::DeleteCrdt,
        id: id.into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    }
}

/// Create a SET_PARENT_KEY reverse op (used as reverse of SET_PARENT_KEY).
pub fn set_parent_key_reverse(id: &str, old_parent_key: Option<String>) -> Op {
    Op {
        op_code: OpCode::SetParentKey,
        id: id.into(),
        op_id: None,
        parent_id: None,
        parent_key: old_parent_key,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    }
}
