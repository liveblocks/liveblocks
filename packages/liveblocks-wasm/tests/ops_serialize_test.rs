use std::collections::BTreeMap;

use liveblocks_wasm::types::{Json, Op, OpCode};

// ---- Op construction helpers ----

fn make_update_object_op(id: &str, data: BTreeMap<String, Json>) -> Op {
    Op {
        op_code: OpCode::UpdateObject,
        id: id.into(),
        op_id: Some("op:1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    }
}

// ---- serde round-trip ----

#[test]
fn op_serializes_to_camel_case_json() {
    let op = Op {
        op_code: OpCode::CreateObject,
        id: "1:0".into(),
        op_id: Some("1:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("child".into()),
        data: Some(Json::Object(BTreeMap::new())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    // Verify camelCase field names
    assert!(json_str.contains("\"type\":"));
    assert!(json_str.contains("\"opId\":"));
    assert!(json_str.contains("\"parentId\":"));
    assert!(json_str.contains("\"parentKey\":"));
    // Should NOT contain snake_case
    assert!(!json_str.contains("op_code"));
    assert!(!json_str.contains("op_id"));
    assert!(!json_str.contains("parent_id"));
    assert!(!json_str.contains("parent_key"));
}

#[test]
fn op_serde_round_trip_create_object() {
    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(1.0));
    let op = Op {
        op_code: OpCode::CreateObject,
        id: "1:0".into(),
        op_id: Some("1:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("child".into()),
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_update_object() {
    let mut data = BTreeMap::new();
    data.insert("key1".into(), Json::String("val".into()));
    let op = make_update_object_op("obj:0", data);
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_delete_crdt() {
    let op = Op {
        op_code: OpCode::DeleteCrdt,
        id: "1:0".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_delete_object_key() {
    let op = Op {
        op_code: OpCode::DeleteObjectKey,
        id: "obj:0".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: Some("prop".into()),
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_create_list() {
    let op = Op {
        op_code: OpCode::CreateList,
        id: "list:0".into(),
        op_id: Some("op:5".into()),
        parent_id: Some("root".into()),
        parent_key: Some("items".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_create_map() {
    let op = Op {
        op_code: OpCode::CreateMap,
        id: "map:0".into(),
        op_id: Some("op:6".into()),
        parent_id: Some("root".into()),
        parent_key: Some("settings".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_create_register() {
    let op = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:0".into(),
        op_id: Some("op:7".into()),
        parent_id: Some("obj:0".into()),
        parent_key: Some("name".into()),
        data: Some(Json::String("Alice".into())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_set_parent_key() {
    let op = Op {
        op_code: OpCode::SetParentKey,
        id: "item:0".into(),
        op_id: Some("op:8".into()),
        parent_id: None,
        parent_key: Some("!".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

#[test]
fn op_serde_round_trip_init() {
    let mut data = BTreeMap::new();
    data.insert("version".into(), Json::Number(1.0));
    let op = Op {
        op_code: OpCode::Init,
        id: "root".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

// ---- Optional fields are omitted when None ----

#[test]
fn op_optional_fields_omitted_in_json() {
    let op = Op {
        op_code: OpCode::DeleteCrdt,
        id: "1:0".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    assert!(!json_str.contains("opId"));
    assert!(!json_str.contains("parentId"));
    assert!(!json_str.contains("parentKey"));
    assert!(!json_str.contains("data"));
    assert!(!json_str.contains("intent"));
    assert!(!json_str.contains("deletedId"));
    assert!(!json_str.contains("key"));
}

// ---- OpCode numeric values ----

#[test]
fn opcode_serializes_as_integer() {
    let op = Op {
        op_code: OpCode::CreateObject,
        id: "1:0".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    // CreateObject = 4
    assert!(json_str.contains("\"type\":4"));
}

// ---- ACK hack ----

#[test]
fn is_ignored_op_detects_ack_hack() {
    let ack_op = Op {
        op_code: OpCode::DeleteCrdt,
        id: "ACK".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    assert!(liveblocks_wasm::types::is_ignored_op(&ack_op));
}

#[test]
fn is_ignored_op_returns_false_for_real_delete() {
    let real_delete = Op {
        op_code: OpCode::DeleteCrdt,
        id: "1:0".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    assert!(!liveblocks_wasm::types::is_ignored_op(&real_delete));
}

// ---- intent and deletedId fields (for LiveList set hack) ----

#[test]
fn op_with_intent_and_deleted_id_round_trips() {
    let op = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:1".into(),
        op_id: Some("op:10".into()),
        parent_id: Some("list:0".into()),
        parent_key: Some("!".into()),
        data: Some(Json::Number(42.0)),
        intent: Some("set".into()),
        deleted_id: Some("reg:0".into()),
        key: None,
    };
    let json_str = serde_json::to_string(&op).unwrap();
    assert!(json_str.contains("\"intent\":\"set\""));
    assert!(json_str.contains("\"deletedId\":\"reg:0\""));
    let deserialized: Op = serde_json::from_str(&json_str).unwrap();
    assert_eq!(op, deserialized);
}

// ---- Op helper constructors (from ops::serialize) ----

#[test]
fn create_object_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(1.0));
    let op = create_object_op("1:0", "root", "child", data.clone());
    assert_eq!(op.op_code, OpCode::CreateObject);
    assert_eq!(op.id, "1:0");
    assert_eq!(op.parent_id, Some("root".into()));
    assert_eq!(op.parent_key, Some("child".into()));
    assert_eq!(op.data, Some(Json::Object(data)));
}

#[test]
fn create_list_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let op = create_list_op("list:0", "root", "items");
    assert_eq!(op.op_code, OpCode::CreateList);
    assert_eq!(op.id, "list:0");
    assert_eq!(op.parent_id, Some("root".into()));
}

#[test]
fn create_map_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let op = create_map_op("map:0", "root", "settings");
    assert_eq!(op.op_code, OpCode::CreateMap);
    assert_eq!(op.id, "map:0");
    assert_eq!(op.parent_id, Some("root".into()));
}

#[test]
fn create_register_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let op = create_register_op("reg:0", "obj:0", "name", Json::String("Alice".into()));
    assert_eq!(op.op_code, OpCode::CreateRegister);
    assert_eq!(op.data, Some(Json::String("Alice".into())));
}

#[test]
fn update_object_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let mut data = BTreeMap::new();
    data.insert("key".into(), Json::Number(42.0));
    let op = update_object_op("obj:0", data.clone());
    assert_eq!(op.op_code, OpCode::UpdateObject);
    assert_eq!(op.id, "obj:0");
    assert_eq!(op.data, Some(Json::Object(data)));
}

#[test]
fn delete_crdt_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let op = delete_crdt_op("1:0");
    assert_eq!(op.op_code, OpCode::DeleteCrdt);
    assert_eq!(op.id, "1:0");
}

#[test]
fn delete_object_key_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let op = delete_object_key_op("obj:0", "prop");
    assert_eq!(op.op_code, OpCode::DeleteObjectKey);
    assert_eq!(op.id, "obj:0");
    assert_eq!(op.key, Some("prop".into()));
}

#[test]
fn set_parent_key_op_helper() {
    use liveblocks_wasm::ops::serialize::*;

    let op = set_parent_key_op("item:0", "!O");
    assert_eq!(op.op_code, OpCode::SetParentKey);
    assert_eq!(op.parent_key, Some("!O".into()));
}
