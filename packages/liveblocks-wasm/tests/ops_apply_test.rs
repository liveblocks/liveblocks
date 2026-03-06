use std::collections::BTreeMap;

use liveblocks_wasm::crdt::node::{CrdtData, CrdtNode};
use liveblocks_wasm::crdt::{list, map, object};
use liveblocks_wasm::document::Document;
use liveblocks_wasm::ops::apply::{apply_op, apply_ops};
use liveblocks_wasm::types::{ApplyResult, Json, Op, OpCode, OpSource};

// ---- helpers ----

fn make_doc_with_root() -> Document {
    let mut doc = Document::new();
    let root = CrdtNode::new_object("root".into());
    doc.insert_root(root);
    doc
}

fn make_op(op_code: OpCode, id: &str) -> Op {
    Op {
        op_code,
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

// ---- ACK hack ----

#[test]
fn apply_ack_hack_returns_not_modified() {
    let mut doc = make_doc_with_root();
    let op = Op {
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
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert_eq!(result, ApplyResult::NotModified);
}

// ---- CREATE_OBJECT ----

#[test]
fn apply_create_object_under_root() {
    let mut doc = make_doc_with_root();
    let op = Op {
        op_code: OpCode::CreateObject,
        id: "obj:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("child".into()),
        data: Some(Json::Object(BTreeMap::new())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    // The child should exist in the document
    let child_key = doc.get_key_by_id("obj:0");
    assert!(child_key.is_some());

    // The root object should have the child at "child" key
    let root_key = doc.root_key().unwrap();
    assert!(object::get_child(&doc, root_key, "child").is_some());
}

// ---- CREATE_LIST ----

#[test]
fn apply_create_list_under_object() {
    let mut doc = make_doc_with_root();
    let op = Op {
        op_code: OpCode::CreateList,
        id: "list:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("items".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    let child_key = doc.get_key_by_id("list:0");
    assert!(child_key.is_some());
    let child = doc.get_node(child_key.unwrap()).unwrap();
    assert!(matches!(&child.data, CrdtData::List { .. }));
}

// ---- CREATE_MAP ----

#[test]
fn apply_create_map_under_object() {
    let mut doc = make_doc_with_root();
    let op = Op {
        op_code: OpCode::CreateMap,
        id: "map:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("settings".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    let child_key = doc.get_key_by_id("map:0");
    assert!(child_key.is_some());
    let child = doc.get_node(child_key.unwrap()).unwrap();
    assert!(matches!(&child.data, CrdtData::Map { .. }));
}

// ---- CREATE_REGISTER ----

#[test]
fn apply_create_register_under_object() {
    let mut doc = make_doc_with_root();
    let op = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("name".into()),
        data: Some(Json::String("Alice".into())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    // The register should be readable through the parent object
    let root_key = doc.root_key().unwrap();
    assert_eq!(
        object::get_plain(&doc, root_key, "name"),
        Some(&Json::String("Alice".into()))
    );
}

#[test]
fn apply_create_register_under_list() {
    let mut doc = make_doc_with_root();

    // First create a list
    let list_op = Op {
        op_code: OpCode::CreateList,
        id: "list:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("items".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &list_op, OpSource::Theirs);

    // Then create a register under the list
    let reg_op = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:0".into(),
        op_id: Some("op:2".into()),
        parent_id: Some("list:0".into()),
        parent_key: Some("!".into()), // position
        data: Some(Json::Number(42.0)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &reg_op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    // The list should have one item
    let list_key = doc.get_key_by_id("list:0").unwrap();
    assert_eq!(list::length(&doc, list_key), 1);
    assert_eq!(list::get(&doc, list_key, 0), Some(Json::Number(42.0)));
}

#[test]
fn apply_create_register_under_map() {
    let mut doc = make_doc_with_root();

    // First create a map
    let map_op = Op {
        op_code: OpCode::CreateMap,
        id: "map:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("settings".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &map_op, OpSource::Theirs);

    // Then create a register under the map
    let reg_op = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:0".into(),
        op_id: Some("op:2".into()),
        parent_id: Some("map:0".into()),
        parent_key: Some("theme".into()),
        data: Some(Json::String("dark".into())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &reg_op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    // The map should have the value
    let map_key = doc.get_key_by_id("map:0").unwrap();
    assert_eq!(
        map::get(&doc, map_key, "theme"),
        Some(Json::String("dark".into()))
    );
}

// ---- UPDATE_OBJECT ----

#[test]
fn apply_update_object() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();
    object::set_plain(&mut doc, root_key, "x", Json::Number(1.0));

    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(2.0));
    let op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("op:1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    assert_eq!(
        object::get_plain(&doc, root_key, "x"),
        Some(&Json::Number(2.0))
    );
}

// ---- DELETE_OBJECT_KEY ----

#[test]
fn apply_delete_object_key() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();
    object::set_plain(&mut doc, root_key, "x", Json::Number(1.0));

    let op = Op {
        op_code: OpCode::DeleteObjectKey,
        id: "root".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: Some("x".into()),
    };
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    assert_eq!(object::get_plain(&doc, root_key, "x"), None);
}

// ---- DELETE_CRDT ----

#[test]
fn apply_delete_crdt_removes_child() {
    let mut doc = make_doc_with_root();

    // Create a child object
    let create_op = Op {
        op_code: OpCode::CreateObject,
        id: "obj:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("child".into()),
        data: Some(Json::Object(BTreeMap::new())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &create_op, OpSource::Theirs);
    assert!(doc.get_key_by_id("obj:0").is_some());

    // Delete the child
    let delete_op = Op {
        op_code: OpCode::DeleteCrdt,
        id: "obj:0".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &delete_op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    // Node should be removed
    assert!(doc.get_key_by_id("obj:0").is_none());

    // Parent should no longer have the child
    let root_key = doc.root_key().unwrap();
    assert!(object::get_child(&doc, root_key, "child").is_none());
}

// ---- SET_PARENT_KEY ----

#[test]
fn apply_set_parent_key_updates_node() {
    let mut doc = make_doc_with_root();

    // Create a list with an item
    let list_op = Op {
        op_code: OpCode::CreateList,
        id: "list:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("items".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &list_op, OpSource::Theirs);

    let reg_op = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:0".into(),
        op_id: Some("op:2".into()),
        parent_id: Some("list:0".into()),
        parent_key: Some("!".into()),
        data: Some(Json::String("first".into())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &reg_op, OpSource::Theirs);

    // Verify item exists
    let reg_key = doc.get_key_by_id("reg:0").unwrap();
    let node = doc.get_node(reg_key).unwrap();
    assert_eq!(node.parent_key, Some("!".into()));

    // Apply SET_PARENT_KEY to move it
    let spk_op = Op {
        op_code: OpCode::SetParentKey,
        id: "reg:0".into(),
        op_id: Some("op:3".into()),
        parent_id: None,
        parent_key: Some("!O".into()),
        data: None,
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &spk_op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    // Node's parent key should be updated
    let node = doc.get_node(reg_key).unwrap();
    assert_eq!(node.parent_key, Some("!O".into()));
}

// ---- Duplicate node ID ----

#[test]
fn apply_create_duplicate_id_returns_not_modified() {
    let mut doc = make_doc_with_root();

    let op = Op {
        op_code: OpCode::CreateObject,
        id: "obj:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("child".into()),
        data: Some(Json::Object(BTreeMap::new())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &op, OpSource::Theirs);

    // Apply same ID again
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert_eq!(result, ApplyResult::NotModified);
}

// ---- Missing parent ----

#[test]
fn apply_create_with_missing_parent_returns_not_modified() {
    let mut doc = make_doc_with_root();
    let op = Op {
        op_code: OpCode::CreateObject,
        id: "obj:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("nonexistent".into()),
        parent_key: Some("child".into()),
        data: Some(Json::Object(BTreeMap::new())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert_eq!(result, ApplyResult::NotModified);
}

// ---- Batch apply ----

#[test]
fn apply_ops_batch() {
    let mut doc = make_doc_with_root();

    let ops = vec![
        Op {
            op_code: OpCode::CreateObject,
            id: "obj:0".into(),
            op_id: Some("op:1".into()),
            parent_id: Some("root".into()),
            parent_key: Some("child".into()),
            data: Some(Json::Object(BTreeMap::new())),
            intent: None,
            deleted_id: None,
            key: None,
        },
        Op {
            op_code: OpCode::CreateRegister,
            id: "reg:0".into(),
            op_id: Some("op:2".into()),
            parent_id: Some("obj:0".into()),
            parent_key: Some("name".into()),
            data: Some(Json::String("Alice".into())),
            intent: None,
            deleted_id: None,
            key: None,
        },
    ];

    let results = apply_ops(&mut doc, &ops, OpSource::Theirs);
    assert_eq!(results.len(), 2);
    assert!(matches!(results[0], ApplyResult::Modified { .. }));
    assert!(matches!(results[1], ApplyResult::Modified { .. }));

    // Verify nested structure
    let obj_key = doc.get_key_by_id("obj:0").unwrap();
    assert_eq!(
        object::get_plain(&doc, obj_key, "name"),
        Some(&Json::String("Alice".into()))
    );
}

// ---- Conflict resolution: LWW on object ----

#[test]
fn apply_update_object_conflict_resolution_theirs_blocked_by_unacked() {
    let mut doc = make_doc_with_root();

    // Apply a LOCAL update (tracks opId)
    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(1.0));
    let local_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("local:1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &local_op, OpSource::Local);

    // Apply a remote update with DIFFERENT opId → should be rejected for conflicting key
    let mut remote_data = BTreeMap::new();
    remote_data.insert("x".into(), Json::Number(99.0));
    let remote_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("remote:1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(remote_data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &remote_op, OpSource::Theirs);

    // Local value should win (conflict resolution)
    let root_key = doc.root_key().unwrap();
    assert_eq!(
        object::get_plain(&doc, root_key, "x"),
        Some(&Json::Number(1.0))
    );
}

#[test]
fn apply_update_object_ack_clears_tracking() {
    let mut doc = make_doc_with_root();

    // LOCAL update
    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(1.0));
    let local_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("local:1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &local_op, OpSource::Local);

    // ACK with same opId → should clear tracking
    let ack_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("local:1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object({
            let mut d = BTreeMap::new();
            d.insert("x".into(), Json::Number(1.0));
            d
        })),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &ack_op, OpSource::Ours);

    // Now a remote update should be accepted
    let mut remote_data = BTreeMap::new();
    remote_data.insert("x".into(), Json::Number(99.0));
    let remote_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("remote:1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(remote_data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &remote_op, OpSource::Theirs);

    let root_key = doc.root_key().unwrap();
    assert_eq!(
        object::get_plain(&doc, root_key, "x"),
        Some(&Json::Number(99.0))
    );
}

// ---- CREATE replaces existing child at same key ----

#[test]
fn apply_create_replaces_existing_child() {
    let mut doc = make_doc_with_root();

    // Create a register at "name"
    let op1 = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("name".into()),
        data: Some(Json::String("Alice".into())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &op1, OpSource::Theirs);

    // Create another register at the same key
    let op2 = Op {
        op_code: OpCode::CreateRegister,
        id: "reg:1".into(),
        op_id: Some("op:2".into()),
        parent_id: Some("root".into()),
        parent_key: Some("name".into()),
        data: Some(Json::String("Bob".into())),
        intent: None,
        deleted_id: None,
        key: None,
    };
    let result = apply_op(&mut doc, &op2, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));

    // New value should replace old
    let root_key = doc.root_key().unwrap();
    assert_eq!(
        object::get_plain(&doc, root_key, "name"),
        Some(&Json::String("Bob".into()))
    );

    // Old node should be removed
    assert!(doc.get_key_by_id("reg:0").is_none());
}

// ---- DELETE missing node ----

#[test]
fn apply_delete_missing_node_returns_not_modified() {
    let mut doc = make_doc_with_root();
    let op = make_op(OpCode::DeleteCrdt, "nonexistent");
    let result = apply_op(&mut doc, &op, OpSource::Theirs);
    assert_eq!(result, ApplyResult::NotModified);
}
