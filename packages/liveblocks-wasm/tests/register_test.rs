use std::collections::BTreeMap;

use liveblocks_wasm::crdt::node::CrdtNode;
use liveblocks_wasm::crdt::register;
use liveblocks_wasm::document::Document;
use liveblocks_wasm::types::{CrdtType, Json, OpCode};

// ---- Construction ----

#[test]
fn register_stores_json_value() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Number(42.0)));
    assert_eq!(register::get_data(&doc, key), Some(&Json::Number(42.0)));
}

#[test]
fn register_stores_string_value() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register(
        "1:0".into(),
        Json::String("hello".into()),
    ));
    assert_eq!(
        register::get_data(&doc, key),
        Some(&Json::String("hello".into()))
    );
}

#[test]
fn register_stores_null() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Null));
    assert_eq!(register::get_data(&doc, key), Some(&Json::Null));
}

#[test]
fn register_stores_bool() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Bool(true)));
    assert_eq!(register::get_data(&doc, key), Some(&Json::Bool(true)));
}

#[test]
fn register_stores_array() {
    let arr = Json::Array(vec![Json::Number(1.0), Json::Number(2.0)]);
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register("1:0".into(), arr.clone()));
    assert_eq!(register::get_data(&doc, key), Some(&arr));
}

#[test]
fn register_stores_object() {
    let mut obj = BTreeMap::new();
    obj.insert("x".into(), Json::Number(10.0));
    let json_obj = Json::Object(obj);
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register("1:0".into(), json_obj.clone()));
    assert_eq!(register::get_data(&doc, key), Some(&json_obj));
}

// ---- Serialization ----

#[test]
fn register_serialize_with_parent() {
    let mut doc = Document::new();
    let _root_key = doc.insert_root(CrdtNode::new_object("root".into()));
    let reg_key = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Number(42.0)));

    // Set parent info
    if let Some(node) = doc.get_node_mut(reg_key) {
        node.parent_id = Some("root".into());
        node.parent_key = Some("prop".into());
    }

    let serialized = register::serialize(&doc, reg_key).unwrap();
    assert_eq!(serialized.crdt_type, CrdtType::Register);
    assert_eq!(serialized.parent_id, Some("root".into()));
    assert_eq!(serialized.parent_key, Some("prop".into()));
    assert_eq!(serialized.data, Some(Json::Number(42.0)));
}

// ---- toOps ----

#[test]
fn register_to_ops_produces_create_register() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register(
        "1:0".into(),
        Json::String("val".into()),
    ));

    let ops = register::to_ops(&doc, key, "root", "myKey");
    assert_eq!(ops.len(), 1);
    assert_eq!(ops[0].op_code, OpCode::CreateRegister);
    assert_eq!(ops[0].id, "1:0");
    assert_eq!(ops[0].parent_id, Some("root".into()));
    assert_eq!(ops[0].parent_key, Some("myKey".into()));
    assert_eq!(ops[0].data, Some(Json::String("val".into())));
}

// ---- toImmutable ----

#[test]
fn register_to_immutable_returns_data() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register("1:0".into(), Json::Number(99.0)));
    assert_eq!(register::to_immutable(&doc, key), Some(Json::Number(99.0)));
}

// ---- clone ----

#[test]
fn register_clone_produces_independent_copy() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_register(
        "1:0".into(),
        Json::Array(vec![Json::Number(1.0)]),
    ));
    let cloned = register::clone_data(&doc, key).unwrap();
    assert_eq!(cloned, Json::Array(vec![Json::Number(1.0)]));
}

// ---- Node type guard ----

#[test]
fn register_get_data_returns_none_for_non_register() {
    let mut doc = Document::new();
    let key = doc.insert_node(CrdtNode::new_object("1:0".into()));
    assert_eq!(register::get_data(&doc, key), None);
}
