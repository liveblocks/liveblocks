use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::collections::BTreeMap;

/// Operation codes matching the TypeScript OpCode enum.
/// Wire format uses integer values 0-8.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum OpCode {
    Init = 0,
    SetParentKey = 1,
    CreateList = 2,
    UpdateObject = 3,
    CreateObject = 4,
    DeleteCrdt = 5,
    DeleteObjectKey = 6,
    CreateMap = 7,
    CreateRegister = 8,
}

/// CRDT node type codes matching the TypeScript CrdtType enum.
/// Wire format uses integer values 0-3.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum CrdtType {
    Object = 0,
    List = 1,
    Map = 2,
    Register = 3,
}

/// Operation source classification.
/// Determined at apply time, not serialized on the wire.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum OpSource {
    /// Optimistic local update (from mutation, undo, redo, or reconnect).
    Local,
    /// From another client or server fix op.
    Theirs,
    /// Echo/ACK of our own op from server.
    Ours,
}

/// JSON value type compatible with the Liveblocks wire format.
/// Uses BTreeMap for deterministic serialization ordering.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Json {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<Json>),
    Object(BTreeMap<String, Json>),
}

/// An operation to be applied to a CRDT node.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Op {
    #[serde(rename = "type")]
    pub op_code: OpCode,
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub op_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Json>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
}

/// Serialized CRDT node for storage snapshots.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerializedCrdt {
    #[serde(rename = "type")]
    pub crdt_type: CrdtType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Json>,
}

/// An ID tuple: (id, value) pair used in storage snapshots.
pub type IdTuple<T> = (String, T);

/// Checks if an op is the ACK hack (IgnoredOp disguised as DELETE_CRDT with id="ACK").
pub fn is_ignored_op(op: &Op) -> bool {
    op.op_code == OpCode::DeleteCrdt && op.id == "ACK"
}

/// Result of applying an operation to a CRDT node.
#[derive(Debug, Clone, PartialEq)]
pub enum ApplyResult {
    /// The operation did not modify the node (e.g., conflict resolution rejected it).
    NotModified,
    /// The operation modified the node, producing reverse ops and a storage update.
    Modified {
        reverse: Vec<Op>,
        update: crate::updates::StorageUpdate,
    },
}
