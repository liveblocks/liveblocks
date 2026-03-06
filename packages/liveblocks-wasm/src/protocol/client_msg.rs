//! Client -> Server message types.
//!
//! Mirrors `packages/liveblocks-core/src/protocol/ClientMsg.ts`.
//! All messages are JSON with a `type` field containing an integer message code.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value as JsonValue;

use crate::types::Op;

/// Client message codes matching the TypeScript ClientMsgCode enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ClientMsgCode {
    UpdatePresence,
    BroadcastEvent,
    FetchStorage,
    UpdateStorage,
    FetchYdoc,
    UpdateYdoc,
}

impl ClientMsgCode {
    fn to_u16(self) -> u16 {
        match self {
            Self::UpdatePresence => 100,
            Self::BroadcastEvent => 103,
            Self::FetchStorage => 200,
            Self::UpdateStorage => 201,
            Self::FetchYdoc => 300,
            Self::UpdateYdoc => 301,
        }
    }

    fn from_u16(code: u16) -> Option<Self> {
        match code {
            100 => Some(Self::UpdatePresence),
            103 => Some(Self::BroadcastEvent),
            200 => Some(Self::FetchStorage),
            201 => Some(Self::UpdateStorage),
            300 => Some(Self::FetchYdoc),
            301 => Some(Self::UpdateYdoc),
            _ => None,
        }
    }
}

/// A client message. Serialized to JSON for sending over WebSocket.
#[derive(Debug, Clone, PartialEq)]
pub enum ClientMsg {
    UpdatePresence {
        target_actor: Option<i32>,
        data: JsonValue,
    },
    BroadcastEvent {
        event: JsonValue,
    },
    FetchStorage {},
    UpdateStorage {
        ops: Vec<Op>,
    },
    FetchYdoc {
        vector: String,
        guid: Option<String>,
        v2: Option<bool>,
    },
    UpdateYdoc {
        update: String,
        guid: Option<String>,
        v2: Option<bool>,
    },
}

impl Serialize for ClientMsg {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;

        match self {
            ClientMsg::UpdatePresence { target_actor, data } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ClientMsgCode::UpdatePresence.to_u16())?;
                if let Some(ta) = target_actor {
                    map.serialize_entry("targetActor", ta)?;
                }
                map.serialize_entry("data", data)?;
                map.end()
            }
            ClientMsg::BroadcastEvent { event } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ClientMsgCode::BroadcastEvent.to_u16())?;
                map.serialize_entry("event", event)?;
                map.end()
            }
            ClientMsg::FetchStorage {} => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ClientMsgCode::FetchStorage.to_u16())?;
                map.end()
            }
            ClientMsg::UpdateStorage { ops } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ClientMsgCode::UpdateStorage.to_u16())?;
                map.serialize_entry("ops", ops)?;
                map.end()
            }
            ClientMsg::FetchYdoc { vector, guid, v2 } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ClientMsgCode::FetchYdoc.to_u16())?;
                map.serialize_entry("vector", vector)?;
                if let Some(g) = guid { map.serialize_entry("guid", g)?; }
                if let Some(v) = v2 { map.serialize_entry("v2", v)?; }
                map.end()
            }
            ClientMsg::UpdateYdoc { update, guid, v2 } => {
                let mut map = serializer.serialize_map(None)?;
                map.serialize_entry("type", &ClientMsgCode::UpdateYdoc.to_u16())?;
                map.serialize_entry("update", update)?;
                if let Some(g) = guid { map.serialize_entry("guid", g)?; }
                if let Some(v) = v2 { map.serialize_entry("v2", v)?; }
                map.end()
            }
        }
    }
}

impl<'de> Deserialize<'de> for ClientMsg {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = JsonValue::deserialize(deserializer)?;
        let obj = value.as_object().ok_or_else(|| {
            serde::de::Error::custom("expected a JSON object for ClientMsg")
        })?;

        let type_code = obj.get("type")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| serde::de::Error::custom("missing or invalid 'type' field"))? as u16;

        let code = ClientMsgCode::from_u16(type_code).ok_or_else(|| {
            serde::de::Error::custom(format!("unknown client message type: {type_code}"))
        })?;

        match code {
            ClientMsgCode::UpdatePresence => {
                Ok(ClientMsg::UpdatePresence {
                    target_actor: obj.get("targetActor").and_then(|v| v.as_i64()).map(|v| v as i32),
                    data: obj.get("data").cloned().unwrap_or(JsonValue::Null),
                })
            }
            ClientMsgCode::BroadcastEvent => {
                Ok(ClientMsg::BroadcastEvent {
                    event: obj.get("event").cloned().unwrap_or(JsonValue::Null),
                })
            }
            ClientMsgCode::FetchStorage => {
                Ok(ClientMsg::FetchStorage {})
            }
            ClientMsgCode::UpdateStorage => {
                Ok(ClientMsg::UpdateStorage {
                    ops: obj.get("ops")
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default(),
                })
            }
            ClientMsgCode::FetchYdoc => {
                Ok(ClientMsg::FetchYdoc {
                    vector: obj.get("vector")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .ok_or_else(|| serde::de::Error::custom("missing 'vector' field"))?,
                    guid: obj.get("guid").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    v2: obj.get("v2").and_then(|v| v.as_bool()),
                })
            }
            ClientMsgCode::UpdateYdoc => {
                Ok(ClientMsg::UpdateYdoc {
                    update: obj.get("update")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .ok_or_else(|| serde::de::Error::custom("missing 'update' field"))?,
                    guid: obj.get("guid").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    v2: obj.get("v2").and_then(|v| v.as_bool()),
                })
            }
        }
    }
}

/// Serialize a batch of client messages as a JSON array string for sending
/// over WebSocket in a single frame.
pub fn serialize_client_msgs(msgs: &[ClientMsg]) -> Result<String, serde_json::Error> {
    serde_json::to_string(msgs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_update_presence_partial() {
        let msg = ClientMsg::UpdatePresence {
            target_actor: None,
            data: serde_json::json!({"cursor": {"x": 10}}),
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(!json.contains("targetActor"));
        assert!(json.contains(r#""type":100"#));
        assert!(json.contains("cursor"));
    }

    #[test]
    fn test_serialize_update_presence_full() {
        let msg = ClientMsg::UpdatePresence {
            target_actor: Some(-1),
            data: serde_json::json!({"name": "Alice"}),
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("targetActor"));
        assert!(json.contains("-1"));
    }

    #[test]
    fn test_serialize_broadcast_event() {
        let msg = ClientMsg::BroadcastEvent {
            event: serde_json::json!({"kind": "emoji", "value": "🎉"}),
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""type":103"#));
        assert!(json.contains("emoji"));
    }

    #[test]
    fn test_serialize_fetch_storage() {
        let msg = ClientMsg::FetchStorage {};
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""type":200"#));
    }

    #[test]
    fn test_serialize_update_storage() {
        let msg = ClientMsg::UpdateStorage {
            ops: vec![crate::types::Op {
                op_code: crate::types::OpCode::UpdateObject,
                id: "root".to_string(),
                op_id: Some("op-1".to_string()),
                parent_id: None,
                parent_key: None,
                data: Some(crate::types::Json::Object(
                    [("x".to_string(), crate::types::Json::Number(42.0))]
                        .into_iter()
                        .collect(),
                )),
                intent: None,
                deleted_id: None,
                key: None,
            }],
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""type":201"#));
        assert!(json.contains("root"));
    }

    #[test]
    fn test_serialize_fetch_ydoc() {
        let msg = ClientMsg::FetchYdoc {
            vector: "base64sv".to_string(),
            guid: Some("sub-1".to_string()),
            v2: Some(true),
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""type":300"#));
        assert!(json.contains("base64sv"));
        assert!(json.contains("sub-1"));
    }

    #[test]
    fn test_serialize_update_ydoc() {
        let msg = ClientMsg::UpdateYdoc {
            update: "base64update".to_string(),
            guid: None,
            v2: None,
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""type":301"#));
        assert!(!json.contains("guid"));
        assert!(!json.contains("v2"));
    }

    #[test]
    fn test_serialize_batch() {
        let msgs = vec![
            ClientMsg::UpdatePresence {
                target_actor: Some(-1),
                data: serde_json::json!({"x": 1}),
            },
            ClientMsg::FetchStorage {},
        ];
        let json = serialize_client_msgs(&msgs).unwrap();
        assert!(json.starts_with('['));
        assert!(json.ends_with(']'));
        assert!(json.contains(r#""type":100"#));
        assert!(json.contains(r#""type":200"#));
    }

    #[test]
    fn test_roundtrip_all_variants() {
        let msgs = vec![
            ClientMsg::UpdatePresence {
                target_actor: Some(5),
                data: serde_json::json!({}),
            },
            ClientMsg::UpdatePresence {
                target_actor: None,
                data: serde_json::json!({"a": 1}),
            },
            ClientMsg::BroadcastEvent {
                event: serde_json::json!("hello"),
            },
            ClientMsg::FetchStorage {},
            ClientMsg::UpdateStorage { ops: vec![] },
            ClientMsg::FetchYdoc {
                vector: "v".to_string(),
                guid: None,
                v2: None,
            },
            ClientMsg::UpdateYdoc {
                update: "u".to_string(),
                guid: Some("g".to_string()),
                v2: Some(true),
            },
        ];

        for msg in &msgs {
            let json = serde_json::to_string(msg).unwrap();
            let parsed: ClientMsg = serde_json::from_str(&json).unwrap();
            assert_eq!(*msg, parsed, "Roundtrip failed for {msg:?}");
        }
    }
}
