use crate::arena::NodeKey;
use crate::crdt::node::CrdtData;
use crate::document::Document;
use crate::types::{CrdtType, Json, Op, OpCode, SerializedCrdt};

/// Get the data stored in a LiveRegister node.
/// Returns None if the node doesn't exist or isn't a Register.
pub fn get_data(doc: &Document, key: NodeKey) -> Option<&Json> {
    match &doc.get_node(key)?.data {
        CrdtData::Register { data } => Some(data),
        _ => None,
    }
}

/// Serialize a LiveRegister to a SerializedCrdt.
pub fn serialize(doc: &Document, key: NodeKey) -> Option<SerializedCrdt> {
    let node = doc.get_node(key)?;
    let data = match &node.data {
        CrdtData::Register { data } => data.clone(),
        _ => return None,
    };

    Some(SerializedCrdt {
        crdt_type: CrdtType::Register,
        parent_id: node.parent_id.clone(),
        parent_key: node.parent_key.clone(),
        data: Some(data),
    })
}

/// Generate the ops needed to recreate this register.
pub fn to_ops(doc: &Document, key: NodeKey, parent_id: &str, parent_key: &str) -> Vec<Op> {
    let Some(node) = doc.get_node(key) else {
        return vec![];
    };
    let data = match &node.data {
        CrdtData::Register { data } => data.clone(),
        _ => return vec![],
    };

    vec![Op {
        op_code: OpCode::CreateRegister,
        id: node.id.clone(),
        op_id: None,
        parent_id: Some(parent_id.to_string()),
        parent_key: Some(parent_key.to_string()),
        data: Some(data),
        intent: None,
        deleted_id: None,
        key: None,
    }]
}

/// Convert a LiveRegister to its immutable representation (just the data).
pub fn to_immutable(doc: &Document, key: NodeKey) -> Option<Json> {
    get_data(doc, key).cloned()
}

/// Clone the data from a LiveRegister.
pub fn clone_data(doc: &Document, key: NodeKey) -> Option<Json> {
    get_data(doc, key).cloned()
}
