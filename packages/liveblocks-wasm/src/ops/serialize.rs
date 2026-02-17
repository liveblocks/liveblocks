use std::collections::BTreeMap;

use crate::types::{Json, Op, OpCode};

/// Create a CREATE_OBJECT op.
pub fn create_object_op(
    id: &str,
    parent_id: &str,
    parent_key: &str,
    data: BTreeMap<String, Json>,
) -> Op {
    Op {
        op_code: OpCode::CreateObject,
        id: id.into(),
        op_id: None,
        parent_id: Some(parent_id.into()),
        parent_key: Some(parent_key.into()),
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    }
}

/// Create a CREATE_LIST op.
pub fn create_list_op(id: &str, parent_id: &str, parent_key: &str) -> Op {
    Op {
        op_code: OpCode::CreateList,
        id: id.into(),
        op_id: None,
        parent_id: Some(parent_id.into()),
        parent_key: Some(parent_key.into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    }
}

/// Create a CREATE_MAP op.
pub fn create_map_op(id: &str, parent_id: &str, parent_key: &str) -> Op {
    Op {
        op_code: OpCode::CreateMap,
        id: id.into(),
        op_id: None,
        parent_id: Some(parent_id.into()),
        parent_key: Some(parent_key.into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    }
}

/// Create a CREATE_REGISTER op.
pub fn create_register_op(id: &str, parent_id: &str, parent_key: &str, data: Json) -> Op {
    Op {
        op_code: OpCode::CreateRegister,
        id: id.into(),
        op_id: None,
        parent_id: Some(parent_id.into()),
        parent_key: Some(parent_key.into()),
        data: Some(data),
        intent: None,
        deleted_id: None,
        key: None,
    }
}

/// Create an UPDATE_OBJECT op.
pub fn update_object_op(id: &str, data: BTreeMap<String, Json>) -> Op {
    Op {
        op_code: OpCode::UpdateObject,
        id: id.into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    }
}

/// Create a DELETE_CRDT op.
pub fn delete_crdt_op(id: &str) -> Op {
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

/// Create a DELETE_OBJECT_KEY op.
pub fn delete_object_key_op(id: &str, key: &str) -> Op {
    Op {
        op_code: OpCode::DeleteObjectKey,
        id: id.into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: Some(key.into()),
    }
}

/// Create a SET_PARENT_KEY op.
pub fn set_parent_key_op(id: &str, parent_key: &str) -> Op {
    Op {
        op_code: OpCode::SetParentKey,
        id: id.into(),
        op_id: None,
        parent_id: None,
        parent_key: Some(parent_key.into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    }
}

/// Convert an Op to a JsValue via serde-wasm-bindgen.
#[cfg(target_arch = "wasm32")]
pub fn op_to_js(op: &Op) -> wasm_bindgen::JsValue {
    serde_wasm_bindgen::to_value(op).unwrap_or(wasm_bindgen::JsValue::UNDEFINED)
}

/// Convert a JsValue to an Op via serde-wasm-bindgen.
#[cfg(target_arch = "wasm32")]
pub fn op_from_js(val: wasm_bindgen::JsValue) -> Result<Op, String> {
    serde_wasm_bindgen::from_value(val).map_err(|e| e.to_string())
}
