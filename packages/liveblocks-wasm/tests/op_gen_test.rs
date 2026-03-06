//! Tests for op generation from handle mutations.
//!
//! These tests exercise the same logic as the handle mutation methods
//! but at the pure-Rust level (no JsValue/wasm_bindgen dependency).

use std::collections::BTreeMap;

use liveblocks_wasm::crdt::node::CrdtNode;
use liveblocks_wasm::crdt::{list, map, object};
use liveblocks_wasm::document::Document;
use liveblocks_wasm::id_gen::IdGenerator;
use liveblocks_wasm::ops::apply;
use liveblocks_wasm::ops::serialize::*;
use liveblocks_wasm::types::{Json, MutationResult, Op, OpCode, OpSource};
use liveblocks_wasm::updates::{StorageUpdate, UpdateDelta};

// ============================================================
// IdGenerator tests
// ============================================================

#[test]
fn id_gen_generates_sequential_node_ids() {
    let mut id_gen = IdGenerator::new(42);
    assert_eq!(id_gen.generate_id(), "42:0");
    assert_eq!(id_gen.generate_id(), "42:1");
    assert_eq!(id_gen.generate_id(), "42:2");
}

#[test]
fn id_gen_generates_sequential_op_ids() {
    let mut id_gen = IdGenerator::new(7);
    assert_eq!(id_gen.generate_op_id(), "7:0");
    assert_eq!(id_gen.generate_op_id(), "7:1");
    assert_eq!(id_gen.generate_op_id(), "7:2");
}

#[test]
fn id_gen_node_and_op_counters_are_independent() {
    let mut id_gen = IdGenerator::new(1);
    assert_eq!(id_gen.generate_id(), "1:0");
    assert_eq!(id_gen.generate_id(), "1:1");
    assert_eq!(id_gen.generate_op_id(), "1:0"); // op counter is separate
    assert_eq!(id_gen.generate_id(), "1:2");
    assert_eq!(id_gen.generate_op_id(), "1:1");
}

#[test]
fn id_gen_set_connection_id() {
    let mut id_gen = IdGenerator::new(1);
    assert_eq!(id_gen.generate_id(), "1:0");
    id_gen.set_connection_id(99);
    assert_eq!(id_gen.generate_id(), "99:1"); // counter continues
    assert_eq!(id_gen.connection_id(), 99);
}

#[test]
fn id_gen_default_is_zero() {
    let mut id_gen = IdGenerator::default();
    assert_eq!(id_gen.generate_id(), "0:0");
    assert_eq!(id_gen.connection_id(), 0);
}

// ============================================================
// Helper: create a document with a root object
// ============================================================

fn make_doc_with_root() -> (Document, liveblocks_wasm::arena::NodeKey) {
    let mut doc = Document::new();
    let root = CrdtNode::new_object("root".to_string());
    let root_key = doc.insert_root(root);
    (doc, root_key)
}

// ============================================================
// LiveObject op generation tests
// ============================================================

#[test]
fn object_set_generates_update_object_op() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    // Capture pre-mutation state
    let node_id = doc.get_node(root_key).unwrap().id.clone();
    let old_value = object::get_plain(&doc, root_key, "name").cloned();
    assert!(old_value.is_none());

    // Generate op_id
    let op_id = id_gen.generate_op_id();

    // Mutate
    object::set_plain(&mut doc, root_key, "name", Json::String("Alice".into()));

    // Construct forward op
    let mut fwd_data = BTreeMap::new();
    fwd_data.insert("name".to_string(), Json::String("Alice".into()));
    let mut fwd_op = update_object_op(&node_id, fwd_data);
    fwd_op.op_id = Some(op_id.clone());

    assert_eq!(fwd_op.op_code, OpCode::UpdateObject);
    assert_eq!(fwd_op.id, "root");
    assert_eq!(fwd_op.op_id, Some("1:0".to_string()));

    // Reverse: DELETE_OBJECT_KEY since key didn't exist before
    let reverse = delete_object_key_op(&node_id, "name");
    assert_eq!(reverse.op_code, OpCode::DeleteObjectKey);
    assert_eq!(reverse.key, Some("name".to_string()));
}

#[test]
fn object_set_existing_key_generates_reverse_update() {
    let (mut doc, root_key) = make_doc_with_root();

    // Set initial value
    object::set_plain(&mut doc, root_key, "name", Json::String("Alice".into()));

    // Capture old value
    let old_value = object::get_plain(&doc, root_key, "name").cloned();
    assert_eq!(old_value, Some(Json::String("Alice".into())));

    // Mutate
    object::set_plain(&mut doc, root_key, "name", Json::String("Bob".into()));

    // Reverse should be UPDATE_OBJECT with old value
    let mut rev_data = BTreeMap::new();
    rev_data.insert("name".to_string(), Json::String("Alice".into()));
    let reverse = update_object_op("root", rev_data);
    assert_eq!(reverse.op_code, OpCode::UpdateObject);

    if let Some(Json::Object(data)) = &reverse.data {
        assert_eq!(data.get("name"), Some(&Json::String("Alice".into())));
    } else {
        panic!("Expected object data in reverse op");
    }
}

#[test]
fn object_delete_generates_delete_object_key_op() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    // Set initial value
    object::set_plain(&mut doc, root_key, "name", Json::String("Alice".into()));

    // Capture pre-mutation state
    let node_id = doc.get_node(root_key).unwrap().id.clone();
    let old_value = object::get_plain(&doc, root_key, "name").cloned();
    assert!(old_value.is_some());

    // Generate op_id
    let op_id = id_gen.generate_op_id();

    // Build reverse BEFORE mutation
    let mut rev_data = BTreeMap::new();
    rev_data.insert("name".to_string(), old_value.clone().unwrap());
    let reverse = update_object_op(&node_id, rev_data);

    // Mutate
    object::delete_key(&mut doc, root_key, "name");

    // Forward op
    let mut fwd_op = delete_object_key_op(&node_id, "name");
    fwd_op.op_id = Some(op_id);

    assert_eq!(fwd_op.op_code, OpCode::DeleteObjectKey);
    assert_eq!(fwd_op.key, Some("name".to_string()));
    assert_eq!(fwd_op.op_id, Some("1:0".to_string()));

    // Reverse restores old value
    assert_eq!(reverse.op_code, OpCode::UpdateObject);
}

#[test]
fn object_update_multiple_keys() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    // Set one initial value
    object::set_plain(&mut doc, root_key, "a", Json::Number(1.0));

    // Capture pre-mutation state for both keys
    let old_a = object::get_plain(&doc, root_key, "a").cloned();
    let old_b = object::get_plain(&doc, root_key, "b").cloned();
    assert_eq!(old_a, Some(Json::Number(1.0)));
    assert!(old_b.is_none());

    // Generate shared op_id
    let op_id = id_gen.generate_op_id();

    // Mutate both
    object::set_plain(&mut doc, root_key, "a", Json::Number(2.0));
    object::set_plain(&mut doc, root_key, "b", Json::String("new".into()));

    // Forward: single UPDATE_OBJECT with both keys
    let mut fwd_data = BTreeMap::new();
    fwd_data.insert("a".to_string(), Json::Number(2.0));
    fwd_data.insert("b".to_string(), Json::String("new".into()));
    let mut fwd_op = update_object_op("root", fwd_data);
    fwd_op.op_id = Some(op_id);
    assert_eq!(fwd_op.op_code, OpCode::UpdateObject);

    // Reverse for "a": UPDATE_OBJECT with old value
    let mut rev_data = BTreeMap::new();
    rev_data.insert("a".to_string(), Json::Number(1.0));
    let rev_update = update_object_op("root", rev_data);
    assert_eq!(rev_update.op_code, OpCode::UpdateObject);

    // Reverse for "b": DELETE_OBJECT_KEY (was new)
    let rev_delete = delete_object_key_op("root", "b");
    assert_eq!(rev_delete.op_code, OpCode::DeleteObjectKey);
}

// ============================================================
// LiveList op generation tests
// ============================================================

#[test]
fn list_push_generates_create_register_op() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    // Create a list child on root
    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    let list_id = "list1";
    let old_length = list::length(&doc, list_key);
    assert_eq!(old_length, 0);

    // Generate IDs
    let reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    // Mutate
    let info = list::push_with_id(&mut doc, list_key, Json::String("hello".into()), &reg_id);

    // Forward op
    let mut fwd_op =
        create_register_op(&reg_id, list_id, &info.position, Json::String("hello".into()));
    fwd_op.op_id = Some(op_id.clone());

    assert_eq!(fwd_op.op_code, OpCode::CreateRegister);
    assert_eq!(fwd_op.id, "1:0"); // reg_id
    assert_eq!(fwd_op.parent_id, Some("list1".to_string()));
    assert_eq!(fwd_op.op_id, Some("1:0".to_string())); // op_id
    assert!(!info.position.is_empty());

    // Reverse: DELETE_CRDT
    let reverse = delete_crdt_op(&reg_id);
    assert_eq!(reverse.op_code, OpCode::DeleteCrdt);
    assert_eq!(reverse.id, "1:0");

    // Verify tree state
    assert_eq!(list::length(&doc, list_key), 1);
    assert_eq!(
        list::get(&doc, list_key, 0),
        Some(Json::String("hello".into()))
    );
}

#[test]
fn list_push_multiple_items_have_ordered_positions() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    let reg1 = id_gen.generate_id();
    let info1 = list::push_with_id(&mut doc, list_key, Json::String("a".into()), &reg1);

    let reg2 = id_gen.generate_id();
    let info2 = list::push_with_id(&mut doc, list_key, Json::String("b".into()), &reg2);

    let reg3 = id_gen.generate_id();
    let info3 = list::push_with_id(&mut doc, list_key, Json::String("c".into()), &reg3);

    // Positions must be strictly increasing
    assert!(info1.position < info2.position);
    assert!(info2.position < info3.position);

    assert_eq!(list::length(&doc, list_key), 3);
}

#[test]
fn list_insert_generates_create_register_at_position() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    // Push two items first
    let reg1 = id_gen.generate_id();
    let info1 = list::push_with_id(&mut doc, list_key, Json::String("a".into()), &reg1);
    let reg2 = id_gen.generate_id();
    let info2 = list::push_with_id(&mut doc, list_key, Json::String("c".into()), &reg2);

    // Insert at index 1 (between "a" and "c")
    let reg3 = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();
    let info3 = list::insert_with_id(&mut doc, list_key, 1, Json::String("b".into()), &reg3);

    // Position should be between the two existing positions
    assert!(info1.position < info3.position);
    assert!(info3.position < info2.position);

    // Forward op
    let mut fwd_op = create_register_op(&reg3, "list1", &info3.position, Json::String("b".into()));
    fwd_op.op_id = Some(op_id);
    assert_eq!(fwd_op.op_code, OpCode::CreateRegister);
    assert_eq!(fwd_op.parent_key, Some(info3.position));

    // Verify tree state
    assert_eq!(
        list::get(&doc, list_key, 0),
        Some(Json::String("a".into()))
    );
    assert_eq!(
        list::get(&doc, list_key, 1),
        Some(Json::String("b".into()))
    );
    assert_eq!(
        list::get(&doc, list_key, 2),
        Some(Json::String("c".into()))
    );
}

#[test]
fn list_delete_generates_delete_crdt_with_reverse_create_chain() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    let reg_id = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("hello".into()), &reg_id);

    // Capture pre-mutation state
    let child_key = list::get_child_key(&doc, list_key, 0).unwrap();
    let child_id = doc.get_node(child_key).unwrap().id.clone();
    let reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);

    // Generate op_id
    let op_id = id_gen.generate_op_id();

    // Mutate
    list::delete(&mut doc, list_key, 0);

    // Forward op
    let mut fwd_op = delete_crdt_op(&child_id);
    fwd_op.op_id = Some(op_id);
    assert_eq!(fwd_op.op_code, OpCode::DeleteCrdt);
    assert_eq!(fwd_op.id, reg_id);

    // Reverse: CREATE_REGISTER to recreate
    assert_eq!(reverse_ops.len(), 1);
    assert_eq!(reverse_ops[0].op_code, OpCode::CreateRegister);
    assert_eq!(reverse_ops[0].id, reg_id);
    assert_eq!(
        reverse_ops[0].data,
        Some(Json::String("hello".into()))
    );

    // Verify tree state
    assert_eq!(list::length(&doc, list_key), 0);
}

#[test]
fn list_set_generates_create_register_with_intent_hack() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    // Push initial value
    let old_reg_id = id_gen.generate_id();
    list::push_with_id(
        &mut doc,
        list_key,
        Json::String("old".into()),
        &old_reg_id,
    );

    // Capture pre-mutation state
    let child_key = list::get_child_key(&doc, list_key, 0).unwrap();
    let old_child_id = doc.get_node(child_key).unwrap().id.clone();
    let position = doc
        .get_node(child_key)
        .unwrap()
        .parent_key
        .clone()
        .unwrap();
    let mut reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);

    // Generate IDs
    let new_reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    // Mutate
    list::set_with_id(
        &mut doc,
        list_key,
        0,
        Json::String("new".into()),
        &new_reg_id,
    );

    // Forward op with intent hack
    let mut fwd_op = create_register_op(
        &new_reg_id,
        "list1",
        &position,
        Json::String("new".into()),
    );
    fwd_op.op_id = Some(op_id);
    fwd_op.intent = Some("set".to_string());
    fwd_op.deleted_id = Some(old_child_id.clone());

    assert_eq!(fwd_op.op_code, OpCode::CreateRegister);
    assert_eq!(fwd_op.intent, Some("set".to_string()));
    assert_eq!(fwd_op.deleted_id, Some(old_reg_id.clone()));

    // Reverse ops with intent hack
    if let Some(first) = reverse_ops.first_mut() {
        first.intent = Some("set".to_string());
        first.deleted_id = Some(new_reg_id.clone());
    }

    assert_eq!(reverse_ops[0].intent, Some("set".to_string()));
    assert_eq!(reverse_ops[0].deleted_id, Some(new_reg_id.clone()));
    assert_eq!(reverse_ops[0].id, old_reg_id);

    // Verify tree state
    assert_eq!(
        list::get(&doc, list_key, 0),
        Some(Json::String("new".into()))
    );
}

#[test]
fn list_move_generates_set_parent_key_op() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    // Push three items
    let reg1 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("a".into()), &reg1);
    let reg2 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("b".into()), &reg2);
    let reg3 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("c".into()), &reg3);

    // Capture pre-mutation state: move item 0 to index 2
    let child_key = list::get_child_key(&doc, list_key, 0).unwrap();
    let child_id = doc.get_node(child_key).unwrap().id.clone();
    let old_position = doc
        .get_node(child_key)
        .unwrap()
        .parent_key
        .clone()
        .unwrap();

    let op_id = id_gen.generate_op_id();

    // Mutate
    list::move_item(&mut doc, list_key, 0, 2);

    // Read new position
    let child_key_after = doc.get_key_by_id(&child_id).unwrap();
    let new_position = doc
        .get_node(child_key_after)
        .unwrap()
        .parent_key
        .clone()
        .unwrap();
    assert_ne!(old_position, new_position);

    // Forward op
    let mut fwd_op = set_parent_key_op(&child_id, &new_position);
    fwd_op.op_id = Some(op_id);
    assert_eq!(fwd_op.op_code, OpCode::SetParentKey);
    assert_eq!(fwd_op.parent_key, Some(new_position));

    // Reverse: SET_PARENT_KEY back to old position
    let reverse = set_parent_key_op(&child_id, &old_position);
    assert_eq!(reverse.op_code, OpCode::SetParentKey);
    assert_eq!(reverse.parent_key, Some(old_position));

    // Verify tree state: order should now be b, c, a
    assert_eq!(
        list::get(&doc, list_key, 0),
        Some(Json::String("b".into()))
    );
    assert_eq!(
        list::get(&doc, list_key, 1),
        Some(Json::String("c".into()))
    );
    assert_eq!(
        list::get(&doc, list_key, 2),
        Some(Json::String("a".into()))
    );
}

#[test]
fn list_clear_generates_delete_crdt_per_child() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    // Push three items
    let reg1 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("a".into()), &reg1);
    let reg2 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("b".into()), &reg2);
    let reg3 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("c".into()), &reg3);

    // Capture all children's IDs and reverse ops BEFORE mutation
    let child_ids: Vec<String> = (0..3)
        .map(|i| {
            let ck = list::get_child_key(&doc, list_key, i).unwrap();
            doc.get_node(ck).unwrap().id.clone()
        })
        .collect();

    let mut all_reverse = Vec::new();
    for i in 0..3 {
        let ck = list::get_child_key(&doc, list_key, i).unwrap();
        all_reverse.extend(apply::generate_create_ops_for_subtree(&doc, ck));
    }

    // Generate op IDs
    let op_ids: Vec<String> = (0..3).map(|_| id_gen.generate_op_id()).collect();

    // Mutate
    list::clear(&mut doc, list_key);

    // Forward ops: one DELETE_CRDT per child
    let fwd_ops: Vec<Op> = child_ids
        .iter()
        .zip(op_ids.iter())
        .map(|(child_id, op_id)| {
            let mut op = delete_crdt_op(child_id);
            op.op_id = Some(op_id.clone());
            op
        })
        .collect();

    assert_eq!(fwd_ops.len(), 3);
    for op in &fwd_ops {
        assert_eq!(op.op_code, OpCode::DeleteCrdt);
        assert!(op.op_id.is_some());
    }

    // Reverse: CREATE chain for all three items
    assert_eq!(all_reverse.len(), 3);
    for rev in &all_reverse {
        assert_eq!(rev.op_code, OpCode::CreateRegister);
    }

    // Verify tree state
    assert_eq!(list::length(&doc, list_key), 0);
}

// ============================================================
// LiveMap op generation tests
// ============================================================

#[test]
fn map_set_generates_create_register_op() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let map_node = CrdtNode::new_map("map1".to_string());
    let map_key = doc.insert_node(map_node);
    object::set_child(&mut doc, root_key, "data", map_key);

    // No old value
    let old_child = map::get_child(&doc, map_key, "key1");
    assert!(old_child.is_none());

    // Generate IDs
    let reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    // Mutate
    map::set_with_id(
        &mut doc,
        map_key,
        "key1",
        Json::String("value1".into()),
        &reg_id,
    );

    // Forward op
    let mut fwd_op =
        create_register_op(&reg_id, "map1", "key1", Json::String("value1".into()));
    fwd_op.op_id = Some(op_id);

    assert_eq!(fwd_op.op_code, OpCode::CreateRegister);
    assert_eq!(fwd_op.id, "1:0");
    assert_eq!(fwd_op.parent_id, Some("map1".to_string()));
    assert_eq!(fwd_op.parent_key, Some("key1".to_string()));

    // Reverse: DELETE_CRDT of the new register (since no old value)
    let reverse = delete_crdt_op(&reg_id);
    assert_eq!(reverse.op_code, OpCode::DeleteCrdt);
    assert_eq!(reverse.id, reg_id);

    // Verify tree state
    assert_eq!(
        map::get(&doc, map_key, "key1"),
        Some(Json::String("value1".into()))
    );
}

#[test]
fn map_set_replacing_existing_generates_reverse_create_chain() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let map_node = CrdtNode::new_map("map1".to_string());
    let map_key = doc.insert_node(map_node);
    object::set_child(&mut doc, root_key, "data", map_key);

    // Set initial value
    let old_reg_id = id_gen.generate_id();
    map::set_with_id(
        &mut doc,
        map_key,
        "key1",
        Json::String("old_value".into()),
        &old_reg_id,
    );

    // Capture pre-mutation state
    let old_child_key = map::get_child(&doc, map_key, "key1").unwrap();
    let old_reverse = apply::generate_create_ops_for_subtree(&doc, old_child_key);
    assert_eq!(old_reverse.len(), 1);
    assert_eq!(old_reverse[0].op_code, OpCode::CreateRegister);
    assert_eq!(old_reverse[0].id, old_reg_id);

    // Generate IDs for new value
    let new_reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    // Mutate
    map::set_with_id(
        &mut doc,
        map_key,
        "key1",
        Json::String("new_value".into()),
        &new_reg_id,
    );

    // Forward op
    let mut fwd_op =
        create_register_op(&new_reg_id, "map1", "key1", Json::String("new_value".into()));
    fwd_op.op_id = Some(op_id);
    assert_eq!(fwd_op.op_code, OpCode::CreateRegister);

    // Reverse: CREATE chain of old item
    assert_eq!(old_reverse[0].data, Some(Json::String("old_value".into())));

    // Verify tree state
    assert_eq!(
        map::get(&doc, map_key, "key1"),
        Some(Json::String("new_value".into()))
    );
}

#[test]
fn map_delete_generates_delete_crdt_with_reverse() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    let map_node = CrdtNode::new_map("map1".to_string());
    let map_key = doc.insert_node(map_node);
    object::set_child(&mut doc, root_key, "data", map_key);

    // Set value
    let reg_id = id_gen.generate_id();
    map::set_with_id(
        &mut doc,
        map_key,
        "key1",
        Json::Number(42.0),
        &reg_id,
    );

    // Capture pre-mutation state
    let child_key = map::get_child(&doc, map_key, "key1").unwrap();
    let child_id = doc.get_node(child_key).unwrap().id.clone();
    let reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);

    let op_id = id_gen.generate_op_id();

    // Mutate
    map::delete(&mut doc, map_key, "key1");

    // Forward op
    let mut fwd_op = delete_crdt_op(&child_id);
    fwd_op.op_id = Some(op_id);
    assert_eq!(fwd_op.op_code, OpCode::DeleteCrdt);
    assert_eq!(fwd_op.id, reg_id);

    // Reverse: CREATE_REGISTER to recreate
    assert_eq!(reverse_ops.len(), 1);
    assert_eq!(reverse_ops[0].op_code, OpCode::CreateRegister);
    assert_eq!(reverse_ops[0].data, Some(Json::Number(42.0)));

    // Verify tree state
    assert!(!map::has(&doc, map_key, "key1"));
}

// ============================================================
// Nested CRDT reverse op tests
// ============================================================

#[test]
fn delete_nested_object_generates_full_create_chain_reverse() {
    let (mut doc, root_key) = make_doc_with_root();

    // Create a nested object with properties
    let child_obj = CrdtNode::new_object("child1".to_string());
    let child_key = doc.insert_node(child_obj);
    object::set_child(&mut doc, root_key, "nested", child_key);

    // Set properties on the nested object
    object::set_plain(
        &mut doc,
        child_key,
        "name",
        Json::String("inner".into()),
    );
    object::set_plain(&mut doc, child_key, "value", Json::Number(99.0));

    // Capture reverse ops BEFORE deleting
    let reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);

    // The reverse should contain a CREATE_OBJECT with inline data
    assert!(!reverse_ops.is_empty());
    assert_eq!(reverse_ops[0].op_code, OpCode::CreateObject);
    assert_eq!(reverse_ops[0].id, "child1");
    assert_eq!(reverse_ops[0].parent_id, Some("root".to_string()));
    assert_eq!(reverse_ops[0].parent_key, Some("nested".to_string()));

    // Verify the CREATE_OBJECT has inline data for plain values
    if let Some(Json::Object(data)) = &reverse_ops[0].data {
        assert_eq!(data.get("name"), Some(&Json::String("inner".into())));
        assert_eq!(data.get("value"), Some(&Json::Number(99.0)));
    } else {
        panic!("Expected object data in CREATE_OBJECT reverse op");
    }
}

#[test]
fn delete_nested_list_generates_full_create_chain_reverse() {
    let (mut doc, root_key) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);

    // Create a nested list
    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    // Push items
    let reg1 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("a".into()), &reg1);
    let reg2 = id_gen.generate_id();
    list::push_with_id(&mut doc, list_key, Json::String("b".into()), &reg2);

    // Capture reverse ops BEFORE deleting
    let reverse_ops = apply::generate_create_ops_for_subtree(&doc, list_key);

    // Should contain CREATE_LIST + 2 CREATE_REGISTERs
    assert_eq!(reverse_ops.len(), 3);
    assert_eq!(reverse_ops[0].op_code, OpCode::CreateList);
    assert_eq!(reverse_ops[0].id, "list1");
    assert_eq!(reverse_ops[1].op_code, OpCode::CreateRegister);
    assert_eq!(reverse_ops[2].op_code, OpCode::CreateRegister);
}

#[test]
fn delete_map_entry_with_nested_object_generates_full_reverse() {
    let (mut doc, root_key) = make_doc_with_root();

    // Create a map
    let map_node = CrdtNode::new_map("map1".to_string());
    let map_key = doc.insert_node(map_node);
    object::set_child(&mut doc, root_key, "data", map_key);

    // Add a nested object to the map
    let nested_obj = CrdtNode::new_object("nested1".to_string());
    let nested_key = doc.insert_node(nested_obj);
    map::set_child(&mut doc, map_key, "key1", nested_key);

    // Set properties on the nested object
    object::set_plain(
        &mut doc,
        nested_key,
        "foo",
        Json::String("bar".into()),
    );

    // Capture reverse ops for the nested object
    let child_key = map::get_child(&doc, map_key, "key1").unwrap();
    let reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);

    // Should contain CREATE_OBJECT with inline data
    assert!(!reverse_ops.is_empty());
    assert_eq!(reverse_ops[0].op_code, OpCode::CreateObject);
    assert_eq!(reverse_ops[0].id, "nested1");
    if let Some(Json::Object(data)) = &reverse_ops[0].data {
        assert_eq!(data.get("foo"), Some(&Json::String("bar".into())));
    } else {
        panic!("Expected object data");
    }
}

// ============================================================
// MutationResult construction tests
// ============================================================

#[test]
fn mutation_result_can_be_constructed_and_compared() {
    let result = MutationResult {
        ops: vec![update_object_op("root", {
            let mut d = BTreeMap::new();
            d.insert("key".to_string(), Json::Number(1.0));
            d
        })],
        reverse_ops: vec![update_object_op("root", {
            let mut d = BTreeMap::new();
            d.insert("key".to_string(), Json::Number(0.0));
            d
        })],
        update: StorageUpdate::LiveObjectUpdate {
            node_id: "root".to_string(),
            updates: {
                let mut m = std::collections::HashMap::new();
                m.insert(
                    "key".to_string(),
                    UpdateDelta::Set {
                        old_value: Some(Json::Number(0.0)),
                        new_value: Json::Number(1.0),
                    },
                );
                m
            },
        },
    };

    assert_eq!(result.ops.len(), 1);
    assert_eq!(result.reverse_ops.len(), 1);
    assert_eq!(result.ops[0].op_code, OpCode::UpdateObject);
}

// ============================================================
// Round-trip: apply generated ops to verify correctness
// ============================================================

#[test]
fn generated_push_op_can_be_applied_to_another_document() {
    // Document A: generate a push op
    let mut doc_a = Document::new();
    let root_a = CrdtNode::new_object("root".to_string());
    let root_key_a = doc_a.insert_root(root_a);
    let list_a = CrdtNode::new_list("list1".to_string());
    let list_key_a = doc_a.insert_node(list_a);
    object::set_child(&mut doc_a, root_key_a, "items", list_key_a);

    let mut id_gen = IdGenerator::new(1);
    let reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();
    let info = list::push_with_id(
        &mut doc_a,
        list_key_a,
        Json::String("hello".into()),
        &reg_id,
    );

    let mut fwd_op = create_register_op(
        &reg_id,
        "list1",
        &info.position,
        Json::String("hello".into()),
    );
    fwd_op.op_id = Some(op_id);

    // Document B: apply the op
    let mut doc_b = Document::new();
    let root_b = CrdtNode::new_object("root".to_string());
    let root_key_b = doc_b.insert_root(root_b);
    let list_b = CrdtNode::new_list("list1".to_string());
    let list_key_b = doc_b.insert_node(list_b);
    object::set_child(&mut doc_b, root_key_b, "items", list_key_b);

    let result = apply::apply_op(&mut doc_b, &fwd_op, OpSource::Theirs);
    assert!(matches!(result, liveblocks_wasm::types::ApplyResult::Modified { .. }));

    // Both documents should have the same value
    assert_eq!(
        list::get(&doc_b, list_key_b, 0),
        Some(Json::String("hello".into()))
    );
}

#[test]
fn generated_update_object_op_can_be_applied() {
    // Document A: set a property
    let (mut doc_a, root_key_a) = make_doc_with_root();
    let mut id_gen = IdGenerator::new(1);
    let op_id = id_gen.generate_op_id();

    object::set_plain(&mut doc_a, root_key_a, "name", Json::String("Alice".into()));

    let mut fwd_data = BTreeMap::new();
    fwd_data.insert("name".to_string(), Json::String("Alice".into()));
    let mut fwd_op = update_object_op("root", fwd_data);
    fwd_op.op_id = Some(op_id);

    // Document B: apply the op
    let (mut doc_b, root_key_b) = make_doc_with_root();
    let result = apply::apply_op(&mut doc_b, &fwd_op, OpSource::Theirs);
    assert!(matches!(result, liveblocks_wasm::types::ApplyResult::Modified { .. }));

    assert_eq!(
        object::get_plain(&doc_b, root_key_b, "name"),
        Some(&Json::String("Alice".into()))
    );
}

// ============================================================
// _with_id variant tests
// ============================================================

#[test]
fn set_plain_with_id_uses_provided_register_id() {
    let (mut doc, root_key) = make_doc_with_root();

    object::set_plain_with_id(
        &mut doc,
        root_key,
        "name",
        Json::String("test".into()),
        "custom-reg-id",
    );

    // The register should have the custom ID
    let child_key = object::get_child(&doc, root_key, "name").unwrap();
    let child = doc.get_node(child_key).unwrap();
    assert_eq!(child.id, "custom-reg-id");
    assert_eq!(
        object::get_plain(&doc, root_key, "name"),
        Some(&Json::String("test".into()))
    );
}

#[test]
fn push_with_id_uses_provided_register_id() {
    let (mut doc, root_key) = make_doc_with_root();

    let list_node = CrdtNode::new_list("list1".to_string());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    let info = list::push_with_id(
        &mut doc,
        list_key,
        Json::String("val".into()),
        "my-reg-42",
    );

    let child_key = list::get_child_key(&doc, list_key, 0).unwrap();
    let child = doc.get_node(child_key).unwrap();
    assert_eq!(child.id, "my-reg-42");
    assert!(!info.position.is_empty());
}

#[test]
fn map_set_with_id_uses_provided_register_id() {
    let (mut doc, root_key) = make_doc_with_root();

    let map_node = CrdtNode::new_map("map1".to_string());
    let map_key = doc.insert_node(map_node);
    object::set_child(&mut doc, root_key, "data", map_key);

    map::set_with_id(
        &mut doc,
        map_key,
        "k",
        Json::Bool(true),
        "map-reg-99",
    );

    let child_key = map::get_child(&doc, map_key, "k").unwrap();
    let child = doc.get_node(child_key).unwrap();
    assert_eq!(child.id, "map-reg-99");
    assert_eq!(map::get(&doc, map_key, "k"), Some(Json::Bool(true)));
}
