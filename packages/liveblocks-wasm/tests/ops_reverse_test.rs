use std::collections::BTreeMap;

use liveblocks_wasm::crdt::node::CrdtNode;
use liveblocks_wasm::crdt::object;
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

fn extract_reverse(result: &ApplyResult) -> &Vec<Op> {
    match result {
        ApplyResult::Modified { reverse, .. } => reverse,
        ApplyResult::NotModified => panic!("Expected Modified, got NotModified"),
    }
}

// ---- UPDATE_OBJECT reverse ----

#[test]
fn update_object_reverse_restores_old_value() {
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
    let result = apply_op(&mut doc, &op, OpSource::Local);
    let reverse = extract_reverse(&result);

    // Reverse should be UPDATE_OBJECT restoring x=1.0
    assert!(!reverse.is_empty());
    let rev_op = &reverse[0];
    assert_eq!(rev_op.op_code, OpCode::UpdateObject);
    match &rev_op.data {
        Some(Json::Object(d)) => {
            assert_eq!(d.get("x"), Some(&Json::Number(1.0)));
        }
        _ => panic!("Expected Object data in reverse op"),
    }
}

#[test]
fn update_object_reverse_for_new_key_is_delete() {
    let mut doc = make_doc_with_root();

    // Set a key that doesn't exist yet
    let mut data = BTreeMap::new();
    data.insert("newkey".into(), Json::Number(42.0));
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
    let result = apply_op(&mut doc, &op, OpSource::Local);
    let reverse = extract_reverse(&result);

    // Reverse should include DELETE_OBJECT_KEY for "newkey"
    let has_delete = reverse
        .iter()
        .any(|r| r.op_code == OpCode::DeleteObjectKey && r.key == Some("newkey".into()));
    assert!(has_delete, "Expected DELETE_OBJECT_KEY in reverse ops");
}

// ---- DELETE_OBJECT_KEY reverse ----

#[test]
fn delete_object_key_reverse_restores_value() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();
    object::set_plain(&mut doc, root_key, "x", Json::Number(5.0));

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
    let result = apply_op(&mut doc, &op, OpSource::Local);
    let reverse = extract_reverse(&result);

    // Reverse should be UPDATE_OBJECT restoring x=5.0
    assert!(!reverse.is_empty());
    let rev_op = &reverse[0];
    assert_eq!(rev_op.op_code, OpCode::UpdateObject);
}

// ---- CREATE_* reverse is DELETE_CRDT ----

#[test]
fn create_object_reverse_is_delete_crdt() {
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
    let reverse = extract_reverse(&result);

    // Reverse of CREATE should include a DELETE_CRDT
    let has_delete = reverse
        .iter()
        .any(|r| r.op_code == OpCode::DeleteCrdt || r.op_code == OpCode::DeleteObjectKey);
    assert!(
        has_delete,
        "Expected delete op in reverse, got: {:?}",
        reverse
    );
}

#[test]
fn create_register_reverse_is_delete() {
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
    let reverse = extract_reverse(&result);
    assert!(!reverse.is_empty());
}

// ---- DELETE_CRDT reverse recreates node ----

#[test]
fn delete_crdt_reverse_recreates_node() {
    let mut doc = make_doc_with_root();

    // Create an object child with data
    let create_op = Op {
        op_code: OpCode::CreateObject,
        id: "obj:0".into(),
        op_id: Some("op:1".into()),
        parent_id: Some("root".into()),
        parent_key: Some("child".into()),
        data: Some(Json::Object({
            let mut d = BTreeMap::new();
            d.insert("inner".into(), Json::Number(42.0));
            d
        })),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &create_op, OpSource::Theirs);

    // Now delete it
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
    let reverse = extract_reverse(&result);

    // Reverse should contain CREATE ops to recreate the object
    let has_create = reverse.iter().any(|r| r.op_code == OpCode::CreateObject);
    assert!(
        has_create,
        "Expected CREATE_OBJECT in reverse ops, got: {:?}",
        reverse
    );
}

// ---- SET_PARENT_KEY reverse ----

#[test]
fn set_parent_key_reverse_has_old_key() {
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
        data: Some(Json::Number(1.0)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    apply_op(&mut doc, &reg_op, OpSource::Theirs);

    // Move via SET_PARENT_KEY
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
    let reverse = extract_reverse(&result);

    // Reverse should be SET_PARENT_KEY with old key "!"
    assert!(!reverse.is_empty());
    let rev_op = &reverse[0];
    assert_eq!(rev_op.op_code, OpCode::SetParentKey);
    assert_eq!(rev_op.parent_key, Some("!".into()));
}

// ---- Applying reverse restores original state ----

#[test]
fn applying_reverse_ops_restores_state() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();
    object::set_plain(&mut doc, root_key, "x", Json::Number(1.0));
    object::set_plain(&mut doc, root_key, "y", Json::Number(2.0));

    // Apply an update
    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(10.0));
    data.insert("y".into(), Json::Number(20.0));
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
    let result = apply_op(&mut doc, &op, OpSource::Local);
    let reverse = extract_reverse(&result).clone();

    // Verify changed state
    assert_eq!(
        object::get_plain(&doc, root_key, "x"),
        Some(&Json::Number(10.0))
    );

    // Apply reverse ops to restore
    let _results = apply_ops(&mut doc, &reverse, OpSource::Local);

    // Values should be restored
    assert_eq!(
        object::get_plain(&doc, root_key, "x"),
        Some(&Json::Number(1.0))
    );
    assert_eq!(
        object::get_plain(&doc, root_key, "y"),
        Some(&Json::Number(2.0))
    );
}
