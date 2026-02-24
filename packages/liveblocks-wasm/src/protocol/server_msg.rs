//! Server -> Client message types.
//!
//! Mirrors `packages/liveblocks-core/src/protocol/ServerMsg.ts`.
//! All messages are JSON with a `type` field containing an integer message code.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

use crate::types::{CrdtType, Json, Op, SerializedCrdt};

/// Server message codes matching the TypeScript ServerMsgCode enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ServerMsgCode {
    UpdatePresence,
    UserJoined,
    UserLeft,
    BroadcastedEvent,
    RoomState,
    StorageState,
    UpdateStorage,
    RejectStorageOp,
    UpdateYdoc,
    ThreadCreated,
    ThreadMetadataUpdated,
    CommentCreated,
    CommentEdited,
    CommentDeleted,
    CommentReactionAdded,
    CommentReactionRemoved,
    ThreadDeleted,
    ThreadUpdated,
    CommentMetadataUpdated,
    StorageChunk,
    StorageStreamEnd,
}

impl ServerMsgCode {
    fn from_u16(code: u16) -> Option<Self> {
        match code {
            100 => Some(Self::UpdatePresence),
            101 => Some(Self::UserJoined),
            102 => Some(Self::UserLeft),
            103 => Some(Self::BroadcastedEvent),
            104 => Some(Self::RoomState),
            200 => Some(Self::StorageState),
            201 => Some(Self::UpdateStorage),
            299 => Some(Self::RejectStorageOp),
            300 => Some(Self::UpdateYdoc),
            400 => Some(Self::ThreadCreated),
            401 => Some(Self::ThreadMetadataUpdated),
            402 => Some(Self::CommentCreated),
            403 => Some(Self::CommentEdited),
            404 => Some(Self::CommentDeleted),
            405 => Some(Self::CommentReactionAdded),
            406 => Some(Self::CommentReactionRemoved),
            407 => Some(Self::ThreadDeleted),
            408 => Some(Self::ThreadUpdated),
            409 => Some(Self::CommentMetadataUpdated),
            210 => Some(Self::StorageChunk),
            211 => Some(Self::StorageStreamEnd),
            _ => None,
        }
    }

    fn to_u16(self) -> u16 {
        match self {
            Self::UpdatePresence => 100,
            Self::UserJoined => 101,
            Self::UserLeft => 102,
            Self::BroadcastedEvent => 103,
            Self::RoomState => 104,
            Self::StorageState => 200,
            Self::UpdateStorage => 201,
            Self::RejectStorageOp => 299,
            Self::UpdateYdoc => 300,
            Self::ThreadCreated => 400,
            Self::ThreadMetadataUpdated => 401,
            Self::CommentCreated => 402,
            Self::CommentEdited => 403,
            Self::CommentDeleted => 404,
            Self::CommentReactionAdded => 405,
            Self::CommentReactionRemoved => 406,
            Self::ThreadDeleted => 407,
            Self::ThreadUpdated => 408,
            Self::CommentMetadataUpdated => 409,
            Self::StorageChunk => 210,
            Self::StorageStreamEnd => 211,
        }
    }
}

/// A server message. Deserialized from JSON received over WebSocket.
///
/// The wire format uses integer `type` fields: `{"type": 100, ...}`.
/// Custom Serialize/Deserialize implementations handle the integer tag.
#[derive(Debug, Clone, PartialEq)]
pub enum ServerMsg {
    // -- Presence --
    UpdatePresence {
        actor: i32,
        target_actor: Option<i32>,
        data: JsonValue,
    },
    UserJoined {
        actor: i32,
        id: Option<String>,
        info: Option<JsonValue>,
        scopes: Vec<String>,
    },
    UserLeft {
        actor: i32,
    },
    BroadcastedEvent {
        actor: i32,
        event: JsonValue,
    },
    RoomState {
        actor: i32,
        nonce: String,
        scopes: Vec<String>,
        users: HashMap<String, JsonValue>,
        meta: JsonValue,
    },

    // -- Storage --
    StorageState {
        items: Vec<(String, SerializedCrdt)>,
    },
    UpdateStorage {
        ops: Vec<Op>,
    },
    RejectStorageOp {
        op_ids: Vec<String>,
        reason: String,
    },

    // -- Yjs --
    UpdateYdoc {
        update: String,
        is_sync: bool,
        state_vector: Option<String>,
        guid: Option<String>,
        v2: Option<bool>,
        remote_snapshot_hash: String,
    },

    // -- Storage V8+ streaming --
    StorageChunk {
        nodes: Vec<JsonValue>,
    },
    StorageStreamEnd,

    // -- Comments --
    ThreadCreated { thread_id: String },
    ThreadMetadataUpdated { thread_id: String },
    CommentCreated { thread_id: String, comment_id: String },
    CommentEdited { thread_id: String, comment_id: String },
    CommentDeleted { thread_id: String, comment_id: String },
    CommentReactionAdded { thread_id: String, comment_id: String, emoji: String },
    CommentReactionRemoved { thread_id: String, comment_id: String, emoji: String },
    ThreadDeleted { thread_id: String },
    ThreadUpdated { thread_id: String },
    CommentMetadataUpdated { thread_id: String, comment_id: String },
}

impl Serialize for ServerMsg {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;

        match self {
            ServerMsg::UpdatePresence { actor, target_actor, data } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::UpdatePresence.to_u16())?;
                map.serialize_entry("actor", actor)?;
                if let Some(ta) = target_actor {
                    map.serialize_entry("targetActor", ta)?;
                }
                map.serialize_entry("data", data)?;
                map.end()
            }
            ServerMsg::UserJoined { actor, id, info, scopes } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::UserJoined.to_u16())?;
                map.serialize_entry("actor", actor)?;
                if let Some(id) = id { map.serialize_entry("id", id)?; }
                if let Some(info) = info { map.serialize_entry("info", info)?; }
                map.serialize_entry("scopes", scopes)?;
                map.end()
            }
            ServerMsg::UserLeft { actor } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::UserLeft.to_u16())?;
                map.serialize_entry("actor", actor)?;
                map.end()
            }
            ServerMsg::BroadcastedEvent { actor, event } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::BroadcastedEvent.to_u16())?;
                map.serialize_entry("actor", actor)?;
                map.serialize_entry("event", event)?;
                map.end()
            }
            ServerMsg::RoomState { actor, nonce, scopes, users, meta } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::RoomState.to_u16())?;
                map.serialize_entry("actor", actor)?;
                map.serialize_entry("nonce", nonce)?;
                map.serialize_entry("scopes", scopes)?;
                map.serialize_entry("users", users)?;
                map.serialize_entry("meta", meta)?;
                map.end()
            }
            ServerMsg::StorageState { items } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::StorageState.to_u16())?;
                map.serialize_entry("items", items)?;
                map.end()
            }
            ServerMsg::UpdateStorage { ops } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::UpdateStorage.to_u16())?;
                map.serialize_entry("ops", ops)?;
                map.end()
            }
            ServerMsg::RejectStorageOp { op_ids, reason } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::RejectStorageOp.to_u16())?;
                map.serialize_entry("opIds", op_ids)?;
                map.serialize_entry("reason", reason)?;
                map.end()
            }
            ServerMsg::UpdateYdoc { update, is_sync, state_vector, guid, v2, remote_snapshot_hash } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::UpdateYdoc.to_u16())?;
                map.serialize_entry("update", update)?;
                map.serialize_entry("isSync", is_sync)?;
                map.serialize_entry("stateVector", state_vector)?;
                if let Some(g) = guid { map.serialize_entry("guid", g)?; }
                if let Some(v) = v2 { map.serialize_entry("v2", v)?; }
                map.serialize_entry("remoteSnapshotHash", remote_snapshot_hash)?;
                map.end()
            }
            ServerMsg::StorageChunk { nodes } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::StorageChunk.to_u16())?;
                map.serialize_entry("nodes", nodes)?;
                map.end()
            }
            ServerMsg::StorageStreamEnd => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::StorageStreamEnd.to_u16())?;
                map.end()
            }
            ServerMsg::ThreadCreated { thread_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::ThreadCreated.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.end()
            }
            ServerMsg::ThreadMetadataUpdated { thread_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::ThreadMetadataUpdated.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.end()
            }
            ServerMsg::CommentCreated { thread_id, comment_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::CommentCreated.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.serialize_entry("commentId", comment_id)?;
                map.end()
            }
            ServerMsg::CommentEdited { thread_id, comment_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::CommentEdited.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.serialize_entry("commentId", comment_id)?;
                map.end()
            }
            ServerMsg::CommentDeleted { thread_id, comment_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::CommentDeleted.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.serialize_entry("commentId", comment_id)?;
                map.end()
            }
            ServerMsg::CommentReactionAdded { thread_id, comment_id, emoji } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::CommentReactionAdded.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.serialize_entry("commentId", comment_id)?;
                map.serialize_entry("emoji", emoji)?;
                map.end()
            }
            ServerMsg::CommentReactionRemoved { thread_id, comment_id, emoji } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::CommentReactionRemoved.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.serialize_entry("commentId", comment_id)?;
                map.serialize_entry("emoji", emoji)?;
                map.end()
            }
            ServerMsg::ThreadDeleted { thread_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::ThreadDeleted.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.end()
            }
            ServerMsg::ThreadUpdated { thread_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::ThreadUpdated.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.end()
            }
            ServerMsg::CommentMetadataUpdated { thread_id, comment_id } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ServerMsgCode::CommentMetadataUpdated.to_u16())?;
                map.serialize_entry("threadId", thread_id)?;
                map.serialize_entry("commentId", comment_id)?;
                map.end()
            }
        }
    }
}

impl<'de> Deserialize<'de> for ServerMsg {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = JsonValue::deserialize(deserializer)?;
        let obj = value.as_object().ok_or_else(|| {
            serde::de::Error::custom("expected a JSON object for ServerMsg")
        })?;

        let type_code = obj.get("type")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| serde::de::Error::custom("missing or invalid 'type' field"))? as u16;

        let code = ServerMsgCode::from_u16(type_code).ok_or_else(|| {
            serde::de::Error::custom(format!("unknown server message type: {type_code}"))
        })?;

        match code {
            ServerMsgCode::UpdatePresence => {
                Ok(ServerMsg::UpdatePresence {
                    actor: get_i32(obj, "actor")?,
                    target_actor: obj.get("targetActor").and_then(|v| v.as_i64()).map(|v| v as i32),
                    data: obj.get("data").cloned().unwrap_or(JsonValue::Null),
                })
            }
            ServerMsgCode::UserJoined => {
                Ok(ServerMsg::UserJoined {
                    actor: get_i32(obj, "actor")?,
                    id: obj.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    info: obj.get("info").cloned(),
                    scopes: obj.get("scopes")
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default(),
                })
            }
            ServerMsgCode::UserLeft => {
                Ok(ServerMsg::UserLeft {
                    actor: get_i32(obj, "actor")?,
                })
            }
            ServerMsgCode::BroadcastedEvent => {
                Ok(ServerMsg::BroadcastedEvent {
                    actor: get_i32(obj, "actor")?,
                    event: obj.get("event").cloned().unwrap_or(JsonValue::Null),
                })
            }
            ServerMsgCode::RoomState => {
                Ok(ServerMsg::RoomState {
                    actor: get_i32(obj, "actor")?,
                    nonce: get_str(obj, "nonce")?,
                    scopes: obj.get("scopes")
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default(),
                    users: obj.get("users")
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default(),
                    meta: obj.get("meta").cloned().unwrap_or(JsonValue::Object(serde_json::Map::new())),
                })
            }
            ServerMsgCode::StorageState => {
                Ok(ServerMsg::StorageState {
                    items: obj.get("items")
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default(),
                })
            }
            ServerMsgCode::UpdateStorage => {
                Ok(ServerMsg::UpdateStorage {
                    ops: obj.get("ops")
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default(),
                })
            }
            ServerMsgCode::RejectStorageOp => {
                Ok(ServerMsg::RejectStorageOp {
                    op_ids: obj.get("opIds")
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default(),
                    reason: get_str(obj, "reason")?,
                })
            }
            ServerMsgCode::UpdateYdoc => {
                Ok(ServerMsg::UpdateYdoc {
                    update: get_str(obj, "update")?,
                    is_sync: obj.get("isSync").and_then(|v| v.as_bool()).unwrap_or(false),
                    state_vector: obj.get("stateVector").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    guid: obj.get("guid").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    v2: obj.get("v2").and_then(|v| v.as_bool()),
                    remote_snapshot_hash: get_str(obj, "remoteSnapshotHash")?,
                })
            }
            ServerMsgCode::StorageChunk => {
                Ok(ServerMsg::StorageChunk {
                    nodes: obj.get("nodes")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default(),
                })
            }
            ServerMsgCode::StorageStreamEnd => {
                Ok(ServerMsg::StorageStreamEnd)
            }
            ServerMsgCode::ThreadCreated => {
                Ok(ServerMsg::ThreadCreated { thread_id: get_str(obj, "threadId")? })
            }
            ServerMsgCode::ThreadMetadataUpdated => {
                Ok(ServerMsg::ThreadMetadataUpdated { thread_id: get_str(obj, "threadId")? })
            }
            ServerMsgCode::CommentCreated => {
                Ok(ServerMsg::CommentCreated {
                    thread_id: get_str(obj, "threadId")?,
                    comment_id: get_str(obj, "commentId")?,
                })
            }
            ServerMsgCode::CommentEdited => {
                Ok(ServerMsg::CommentEdited {
                    thread_id: get_str(obj, "threadId")?,
                    comment_id: get_str(obj, "commentId")?,
                })
            }
            ServerMsgCode::CommentDeleted => {
                Ok(ServerMsg::CommentDeleted {
                    thread_id: get_str(obj, "threadId")?,
                    comment_id: get_str(obj, "commentId")?,
                })
            }
            ServerMsgCode::CommentReactionAdded => {
                Ok(ServerMsg::CommentReactionAdded {
                    thread_id: get_str(obj, "threadId")?,
                    comment_id: get_str(obj, "commentId")?,
                    emoji: get_str(obj, "emoji")?,
                })
            }
            ServerMsgCode::CommentReactionRemoved => {
                Ok(ServerMsg::CommentReactionRemoved {
                    thread_id: get_str(obj, "threadId")?,
                    comment_id: get_str(obj, "commentId")?,
                    emoji: get_str(obj, "emoji")?,
                })
            }
            ServerMsgCode::ThreadDeleted => {
                Ok(ServerMsg::ThreadDeleted { thread_id: get_str(obj, "threadId")? })
            }
            ServerMsgCode::ThreadUpdated => {
                Ok(ServerMsg::ThreadUpdated { thread_id: get_str(obj, "threadId")? })
            }
            ServerMsgCode::CommentMetadataUpdated => {
                Ok(ServerMsg::CommentMetadataUpdated {
                    thread_id: get_str(obj, "threadId")?,
                    comment_id: get_str(obj, "commentId")?,
                })
            }
        }
    }
}

fn get_i32<E: serde::de::Error>(obj: &serde_json::Map<String, JsonValue>, key: &str) -> Result<i32, E> {
    obj.get(key)
        .and_then(|v| v.as_i64())
        .map(|v| v as i32)
        .ok_or_else(|| E::custom(format!("missing or invalid '{key}' field")))
}

fn get_str<E: serde::de::Error>(obj: &serde_json::Map<String, JsonValue>, key: &str) -> Result<String, E> {
    obj.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| E::custom(format!("missing or invalid '{key}' field")))
}

/// Parse a raw WebSocket text frame into one or more server messages.
///
/// The server may send either a single JSON object or a JSON array of objects.
/// "pong" is handled at the transport layer, not here.
pub fn parse_server_messages(data: &str) -> Result<Vec<ServerMsg>, serde_json::Error> {
    let trimmed = data.trim();
    if trimmed.starts_with('[') {
        serde_json::from_str(trimmed)
    } else {
        let msg: ServerMsg = serde_json::from_str(trimmed)?;
        Ok(vec![msg])
    }
}

/// Convert a JsonValue into our internal Json type.
fn json_value_to_json(v: &JsonValue) -> Json {
    match v {
        JsonValue::Null => Json::Null,
        JsonValue::Bool(b) => Json::Bool(*b),
        JsonValue::Number(n) => Json::Number(n.as_f64().unwrap_or(0.0)),
        JsonValue::String(s) => Json::String(s.clone()),
        JsonValue::Array(arr) => Json::Array(arr.iter().map(json_value_to_json).collect()),
        JsonValue::Object(obj) => {
            let map = obj.iter().map(|(k, v)| (k.clone(), json_value_to_json(v))).collect();
            Json::Object(map)
        }
    }
}

/// Convert a JsonValue object into a Json::Object suitable for SerializedCrdt data.
fn json_value_to_data(v: &JsonValue) -> Option<Json> {
    match v {
        JsonValue::Object(obj) => {
            let map = obj.iter().map(|(k, v)| (k.clone(), json_value_to_json(v))).collect();
            Some(Json::Object(map))
        }
        _ => Some(json_value_to_json(v)),
    }
}

/// Convert compact node arrays (from STORAGE_CHUNK) to IdTuple items.
///
/// Compact format:
/// - Root: `["root", {data}]`
/// - Child Object: `[id, 0, parentId, parentKey, {data}]`
/// - Child List: `[id, 1, parentId, parentKey]`
/// - Child Map: `[id, 2, parentId, parentKey]`
/// - Child Register: `[id, 3, parentId, parentKey, data]`
pub fn compact_nodes_to_id_tuples(nodes: &[JsonValue]) -> Vec<(String, SerializedCrdt)> {
    let mut items = Vec::new();
    for node in nodes {
        let arr = match node.as_array() {
            Some(a) => a,
            None => continue,
        };
        if arr.is_empty() {
            continue;
        }

        let id = match arr[0].as_str() {
            Some(s) => s.to_string(),
            None => continue,
        };

        // Root node: ["root", {data}]
        if id == "root" && arr.len() == 2 {
            items.push((id, SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: None,
                parent_key: None,
                data: json_value_to_data(&arr[1]),
            }));
            continue;
        }

        // Child node: [id, type, parentId, parentKey, ...data]
        if arr.len() < 4 {
            continue;
        }
        let crdt_type_code = match arr[1].as_u64() {
            Some(n) => n as u8,
            None => continue,
        };
        let parent_id = arr[2].as_str().map(|s| s.to_string());
        let parent_key = arr[3].as_str().map(|s| s.to_string());

        let (crdt_type, data) = match crdt_type_code {
            0 => { // Object
                let data = if arr.len() > 4 { json_value_to_data(&arr[4]) } else { None };
                (CrdtType::Object, data)
            }
            1 => (CrdtType::List, None),    // List
            2 => (CrdtType::Map, None),     // Map
            3 => { // Register
                let data = if arr.len() > 4 { json_value_to_data(&arr[4]) } else { None };
                (CrdtType::Register, data)
            }
            _ => continue,
        };

        items.push((id, SerializedCrdt {
            crdt_type,
            parent_id,
            parent_key,
            data,
        }));
    }
    items
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_update_presence_partial() {
        let json = r#"{"type": 100, "actor": 5, "data": {"cursor": {"x": 10, "y": 20}}}"#;
        let msgs = parse_server_messages(json).unwrap();
        assert_eq!(msgs.len(), 1);
        match &msgs[0] {
            ServerMsg::UpdatePresence { actor, target_actor, data } => {
                assert_eq!(*actor, 5);
                assert!(target_actor.is_none());
                assert_eq!(data["cursor"]["x"], 10);
            }
            other => panic!("Expected UpdatePresence, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_update_presence_full() {
        let json = r#"{"type": 100, "actor": 3, "targetActor": 7, "data": {"name": "Alice"}}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::UpdatePresence { actor, target_actor, data } => {
                assert_eq!(*actor, 3);
                assert_eq!(*target_actor, Some(7));
                assert_eq!(data["name"], "Alice");
            }
            other => panic!("Expected UpdatePresence, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_user_joined() {
        let json = r#"{"type": 101, "actor": 2, "id": "user-1", "info": {"name": "Bob"}, "scopes": ["room:write"]}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::UserJoined { actor, id, info, scopes } => {
                assert_eq!(*actor, 2);
                assert_eq!(id.as_deref(), Some("user-1"));
                assert!(info.is_some());
                assert_eq!(scopes, &["room:write"]);
            }
            other => panic!("Expected UserJoined, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_user_left() {
        let json = r#"{"type": 102, "actor": 4}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::UserLeft { actor } => assert_eq!(*actor, 4),
            other => panic!("Expected UserLeft, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_broadcasted_event() {
        let json = r#"{"type": 103, "actor": 1, "event": {"kind": "click", "x": 42}}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::BroadcastedEvent { actor, event } => {
                assert_eq!(*actor, 1);
                assert_eq!(event["kind"], "click");
            }
            other => panic!("Expected BroadcastedEvent, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_room_state() {
        let json = r#"{
            "type": 104,
            "actor": 10,
            "nonce": "abc123",
            "scopes": ["room:write", "room:read"],
            "users": {
                "5": {"id": "user-5", "info": {}}
            },
            "meta": {}
        }"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::RoomState { actor, nonce, scopes, users, .. } => {
                assert_eq!(*actor, 10);
                assert_eq!(nonce, "abc123");
                assert_eq!(scopes.len(), 2);
                assert!(users.contains_key("5"));
            }
            other => panic!("Expected RoomState, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_storage_state() {
        let json = r#"{
            "type": 200,
            "items": [
                ["root", {"type": 0, "data": {"count": 0}}]
            ]
        }"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::StorageState { items } => {
                assert_eq!(items.len(), 1);
                assert_eq!(items[0].0, "root");
            }
            other => panic!("Expected StorageState, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_update_storage() {
        let json = r#"{
            "type": 201,
            "ops": [
                {"type": 3, "id": "root", "data": {"count": 1}}
            ]
        }"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::UpdateStorage { ops } => {
                assert_eq!(ops.len(), 1);
                assert_eq!(ops[0].id, "root");
            }
            other => panic!("Expected UpdateStorage, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_reject_storage_op() {
        let json = r#"{"type": 299, "opIds": ["op-1", "op-2"], "reason": "Forbidden"}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::RejectStorageOp { op_ids, reason } => {
                assert_eq!(op_ids, &["op-1", "op-2"]);
                assert_eq!(reason, "Forbidden");
            }
            other => panic!("Expected RejectStorageOp, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_thread_created() {
        let json = r#"{"type": 400, "threadId": "th_123"}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::ThreadCreated { thread_id } => {
                assert_eq!(thread_id, "th_123");
            }
            other => panic!("Expected ThreadCreated, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_comment_created() {
        let json = r#"{"type": 402, "threadId": "th_1", "commentId": "cm_1"}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::CommentCreated { thread_id, comment_id } => {
                assert_eq!(thread_id, "th_1");
                assert_eq!(comment_id, "cm_1");
            }
            other => panic!("Expected CommentCreated, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_comment_reaction_added() {
        let json = r#"{"type": 405, "threadId": "th_1", "commentId": "cm_1", "emoji": "👍"}"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::CommentReactionAdded { thread_id, comment_id, emoji } => {
                assert_eq!(thread_id, "th_1");
                assert_eq!(comment_id, "cm_1");
                assert_eq!(emoji, "👍");
            }
            other => panic!("Expected CommentReactionAdded, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_array_of_messages() {
        let json = r#"[
            {"type": 102, "actor": 1},
            {"type": 102, "actor": 2}
        ]"#;
        let msgs = parse_server_messages(json).unwrap();
        assert_eq!(msgs.len(), 2);
    }

    #[test]
    fn test_parse_ydoc_update() {
        let json = r#"{
            "type": 300,
            "update": "base64data",
            "isSync": true,
            "stateVector": "sv_data",
            "remoteSnapshotHash": "hash123"
        }"#;
        let msgs = parse_server_messages(json).unwrap();
        match &msgs[0] {
            ServerMsg::UpdateYdoc { update, is_sync, state_vector, remote_snapshot_hash, .. } => {
                assert_eq!(update, "base64data");
                assert!(*is_sync);
                assert_eq!(state_vector.as_deref(), Some("sv_data"));
                assert_eq!(remote_snapshot_hash, "hash123");
            }
            other => panic!("Expected UpdateYdoc, got {other:?}"),
        }
    }

    #[test]
    fn test_roundtrip_update_presence() {
        let msg = ServerMsg::UpdatePresence {
            actor: 5,
            target_actor: None,
            data: serde_json::json!({"cursor": {"x": 1}}),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let parsed: ServerMsg = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, parsed);
    }

    #[test]
    fn test_roundtrip_update_storage() {
        let msg = ServerMsg::UpdateStorage {
            ops: vec![crate::types::Op {
                op_code: crate::types::OpCode::UpdateObject,
                id: "root".to_string(),
                op_id: Some("op-1".to_string()),
                parent_id: None,
                parent_key: None,
                data: Some(crate::types::Json::Object(
                    [("count".to_string(), crate::types::Json::Number(1.0))]
                        .into_iter()
                        .collect(),
                )),
                intent: None,
                deleted_id: None,
                key: None,
            }],
        };
        let json = serde_json::to_string(&msg).unwrap();
        let parsed: ServerMsg = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, parsed);
    }

    #[test]
    fn test_all_comment_events() {
        let test_cases = vec![
            (r#"{"type": 400, "threadId": "t1"}"#, "ThreadCreated"),
            (r#"{"type": 401, "threadId": "t1"}"#, "ThreadMetadataUpdated"),
            (r#"{"type": 402, "threadId": "t1", "commentId": "c1"}"#, "CommentCreated"),
            (r#"{"type": 403, "threadId": "t1", "commentId": "c1"}"#, "CommentEdited"),
            (r#"{"type": 404, "threadId": "t1", "commentId": "c1"}"#, "CommentDeleted"),
            (r#"{"type": 405, "threadId": "t1", "commentId": "c1", "emoji": "😀"}"#, "CommentReactionAdded"),
            (r#"{"type": 406, "threadId": "t1", "commentId": "c1", "emoji": "😀"}"#, "CommentReactionRemoved"),
            (r#"{"type": 407, "threadId": "t1"}"#, "ThreadDeleted"),
            (r#"{"type": 408, "threadId": "t1"}"#, "ThreadUpdated"),
            (r#"{"type": 409, "threadId": "t1", "commentId": "c1"}"#, "CommentMetadataUpdated"),
        ];

        for (json, expected_name) in test_cases {
            let msgs = parse_server_messages(json).unwrap();
            assert_eq!(msgs.len(), 1, "Failed to parse {expected_name}");
        }
    }
}
