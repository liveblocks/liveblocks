use std::collections::BTreeMap;

use liveblocks_wasm::crdt::node::CrdtNode;
use liveblocks_wasm::crdt::object;
use liveblocks_wasm::crdt::register;
use liveblocks_wasm::document::Document;
use liveblocks_wasm::types::{ApplyResult, CrdtType, Json, Op, OpCode, OpSource};

fn make_doc_with_root() -> (Document, liveblocks_wasm::arena::NodeKey) {
    let mut doc = Document::new();
    let root = doc.insert_root(CrdtNode::new_object("root".into()));
    (doc, root)
}

// ---- get / set plain values ----

#[test]
fn object_set_and_get_plain_value() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "name", Json::String("Alice".into()));
    assert_eq!(
        object::get_plain(&doc, root, "name"),
        Some(&Json::String("Alice".into()))
    );
}

#[test]
fn object_get_missing_key_returns_none() {
    let (doc, root) = make_doc_with_root();
    assert_eq!(object::get_plain(&doc, root, "missing"), None);
}

#[test]
fn object_set_overwrites_existing_value() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "x", Json::Number(1.0));
    object::set_plain(&mut doc, root, "x", Json::Number(2.0));
    assert_eq!(object::get_plain(&doc, root, "x"), Some(&Json::Number(2.0)));
}

// ---- delete ----

#[test]
fn object_delete_removes_key() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "x", Json::Number(1.0));
    object::delete_key(&mut doc, root, "x");
    assert_eq!(object::get_plain(&doc, root, "x"), None);
}

#[test]
fn object_delete_nonexistent_key_is_noop() {
    let (mut doc, root) = make_doc_with_root();
    object::delete_key(&mut doc, root, "nonexistent");
    // Should not panic
}

// ---- child CRDT nodes ----

#[test]
fn object_set_child_node() {
    let (mut doc, root) = make_doc_with_root();
    let child = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Number(42.0)));
    object::set_child(&mut doc, root, "nested", child);

    let child_key = object::get_child(&doc, root, "nested");
    assert!(child_key.is_some());
    assert_eq!(
        register::get_data(&doc, child_key.unwrap()),
        Some(&Json::Number(42.0))
    );
}

#[test]
fn object_delete_child_node() {
    let (mut doc, root) = make_doc_with_root();
    let child = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Number(42.0)));
    object::set_child(&mut doc, root, "nested", child);
    object::delete_key(&mut doc, root, "nested");
    assert!(object::get_child(&doc, root, "nested").is_none());
}

// ---- to_object (flat JSON view) ----

#[test]
fn object_to_object_returns_plain_values() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "a", Json::Number(1.0));
    object::set_plain(&mut doc, root, "b", Json::String("two".into()));

    let obj = object::to_object(&doc, root);
    assert_eq!(obj.get("a"), Some(&Json::Number(1.0)));
    assert_eq!(obj.get("b"), Some(&Json::String("two".into())));
    assert_eq!(obj.len(), 2);
}

// ---- toImmutable (recursive) ----

#[test]
fn object_to_immutable_includes_plain_values() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "x", Json::Number(5.0));
    let immutable = object::to_immutable(&doc, root);
    match immutable {
        Some(Json::Object(map)) => {
            assert_eq!(map.get("x"), Some(&Json::Number(5.0)));
        }
        _ => panic!("Expected Json::Object"),
    }
}

// ---- serialize ----

#[test]
fn object_serialize_root() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "name", Json::String("test".into()));

    let serialized = object::serialize(&doc, root).unwrap();
    assert_eq!(serialized.crdt_type, CrdtType::Object);
    assert_eq!(serialized.parent_id, None); // root has no parent
    assert_eq!(serialized.parent_key, None);
}

#[test]
fn object_serialize_child() {
    let (mut doc, _root) = make_doc_with_root();
    let child_obj = doc.insert_node(CrdtNode::new_object("1:0".into()));
    // Set parent info manually
    if let Some(node) = doc.get_node_mut(child_obj) {
        node.parent_id = Some("root".into());
        node.parent_key = Some("child".into());
    }
    object::set_plain(&mut doc, child_obj, "inner", Json::Bool(true));

    let serialized = object::serialize(&doc, child_obj).unwrap();
    assert_eq!(serialized.crdt_type, CrdtType::Object);
    assert_eq!(serialized.parent_id, Some("root".into()));
    assert_eq!(serialized.parent_key, Some("child".into()));
}

// ---- toOps ----

#[test]
fn object_to_ops_produces_create_object() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "x", Json::Number(1.0));

    let ops = object::to_ops(&doc, root, "parent", "key");
    assert!(!ops.is_empty());
    assert_eq!(ops[0].op_code, OpCode::CreateObject);
    assert_eq!(ops[0].id, "root");
    assert_eq!(ops[0].parent_id, Some("parent".into()));
    assert_eq!(ops[0].parent_key, Some("key".into()));
    // Plain data should be in the op's data field
    if let Some(Json::Object(data)) = &ops[0].data {
        assert_eq!(data.get("x"), Some(&Json::Number(1.0)));
    } else {
        panic!("Expected data in CreateObject op");
    }
}

// ---- apply UPDATE_OBJECT ----

#[test]
fn object_apply_update_sets_values() {
    let (mut doc, root) = make_doc_with_root();

    let mut data = BTreeMap::new();
    data.insert("name".into(), Json::String("Bob".into()));
    let op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };

    let result = object::apply_update(&mut doc, root, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));
    assert_eq!(
        object::get_plain(&doc, root, "name"),
        Some(&Json::String("Bob".into()))
    );
}

#[test]
fn object_apply_update_local_tracks_unacked() {
    let (mut doc, root) = make_doc_with_root();

    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(1.0));
    let op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("op1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };

    object::apply_update(&mut doc, root, &op, OpSource::Local);

    // Now a remote op for the same key should be rejected (conflict)
    let mut data2 = BTreeMap::new();
    data2.insert("x".into(), Json::Number(999.0));
    let remote_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("op2".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data2)),
        intent: None,
        deleted_id: None,
        key: None,
    };

    let result = object::apply_update(&mut doc, root, &remote_op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::NotModified));
    // Original value preserved
    assert_eq!(object::get_plain(&doc, root, "x"), Some(&Json::Number(1.0)));
}

#[test]
fn object_apply_update_ack_clears_tracking() {
    let (mut doc, root) = make_doc_with_root();

    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(1.0));
    let op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("op1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data.clone())),
        intent: None,
        deleted_id: None,
        key: None,
    };

    object::apply_update(&mut doc, root, &op, OpSource::Local);

    // ACK with matching opId
    let ack_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("op1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };

    let result = object::apply_update(&mut doc, root, &ack_op, OpSource::Ours);
    assert!(matches!(result, ApplyResult::NotModified));

    // After ACK, remote ops should now be accepted
    let mut data3 = BTreeMap::new();
    data3.insert("x".into(), Json::Number(999.0));
    let remote_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("op3".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data3)),
        intent: None,
        deleted_id: None,
        key: None,
    };

    let result = object::apply_update(&mut doc, root, &remote_op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));
    assert_eq!(
        object::get_plain(&doc, root, "x"),
        Some(&Json::Number(999.0))
    );
}

// ---- apply DELETE_OBJECT_KEY ----

#[test]
fn object_apply_delete_key_removes_property() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "x", Json::Number(1.0));

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

    let result = object::apply_delete_object_key(&mut doc, root, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::Modified { .. }));
    assert_eq!(object::get_plain(&doc, root, "x"), None);
}

#[test]
fn object_apply_delete_nonexistent_key_is_noop() {
    let (mut doc, root) = make_doc_with_root();

    let op = Op {
        op_code: OpCode::DeleteObjectKey,
        id: "root".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: None,
        intent: None,
        deleted_id: None,
        key: Some("missing".into()),
    };

    let result = object::apply_delete_object_key(&mut doc, root, &op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::NotModified));
}

#[test]
fn object_apply_delete_blocked_by_unacked() {
    let (mut doc, root) = make_doc_with_root();

    // Local update
    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(1.0));
    let local_op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: Some("op1".into()),
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };
    object::apply_update(&mut doc, root, &local_op, OpSource::Local);

    // Remote delete for same key should be rejected
    let delete_op = Op {
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

    let result = object::apply_delete_object_key(&mut doc, root, &delete_op, OpSource::Theirs);
    assert!(matches!(result, ApplyResult::NotModified));
    // Value still exists
    assert_eq!(object::get_plain(&doc, root, "x"), Some(&Json::Number(1.0)));
}

// ---- reverse ops ----

#[test]
fn object_apply_update_generates_reverse_ops() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "x", Json::Number(1.0));

    let mut data = BTreeMap::new();
    data.insert("x".into(), Json::Number(2.0));
    let op = Op {
        op_code: OpCode::UpdateObject,
        id: "root".into(),
        op_id: None,
        parent_id: None,
        parent_key: None,
        data: Some(Json::Object(data)),
        intent: None,
        deleted_id: None,
        key: None,
    };

    let result = object::apply_update(&mut doc, root, &op, OpSource::Theirs);
    if let ApplyResult::Modified { reverse, .. } = result {
        // Reverse should restore x to 1.0
        assert!(!reverse.is_empty());
        let rev = &reverse[0];
        assert_eq!(rev.op_code, OpCode::UpdateObject);
        if let Some(Json::Object(data)) = &rev.data {
            assert_eq!(data.get("x"), Some(&Json::Number(1.0)));
        } else {
            panic!("Expected reverse op to have data");
        }
    } else {
        panic!("Expected Modified result");
    }
}

#[test]
fn object_apply_delete_generates_reverse_update() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "x", Json::Number(1.0));

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

    let result = object::apply_delete_object_key(&mut doc, root, &op, OpSource::Theirs);
    if let ApplyResult::Modified { reverse, .. } = result {
        assert!(!reverse.is_empty());
        let rev = &reverse[0];
        assert_eq!(rev.op_code, OpCode::UpdateObject);
        if let Some(Json::Object(data)) = &rev.data {
            assert_eq!(data.get("x"), Some(&Json::Number(1.0)));
        } else {
            panic!("Expected reverse op to restore the deleted value");
        }
    } else {
        panic!("Expected Modified result");
    }
}

// ---- keys / entries ----

#[test]
fn object_keys_returns_all_keys() {
    let (mut doc, root) = make_doc_with_root();
    object::set_plain(&mut doc, root, "a", Json::Null);
    object::set_plain(&mut doc, root, "b", Json::Null);
    object::set_plain(&mut doc, root, "c", Json::Null);

    let mut keys = object::keys(&doc, root);
    keys.sort();
    assert_eq!(keys, vec!["a", "b", "c"]);
}

// ---- guard: operations on non-object node ----

#[test]
fn object_get_plain_returns_none_for_non_object() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Null));
    assert_eq!(object::get_plain(&doc, key, "anything"), None);
}
