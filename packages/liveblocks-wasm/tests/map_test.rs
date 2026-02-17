use liveblocks_wasm::crdt::map;
use liveblocks_wasm::crdt::node::CrdtNode;
use liveblocks_wasm::crdt::object;
use liveblocks_wasm::document::Document;
use liveblocks_wasm::types::{Json, OpCode};

fn make_doc_with_map() -> (Document, liveblocks_wasm::arena::NodeKey) {
    let mut doc = Document::new();
    let map_key = doc.insert_node(CrdtNode::new_map("map:0".into()));
    (doc, map_key)
}

// ---- basic operations ----

#[test]
fn map_set_and_get() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "key1", Json::Number(1.0));
    assert_eq!(map::get(&doc, mk, "key1"), Some(Json::Number(1.0)));
}

#[test]
fn map_get_missing_key_returns_none() {
    let (doc, mk) = make_doc_with_map();
    assert_eq!(map::get(&doc, mk, "missing"), None);
}

#[test]
fn map_set_overwrites_existing() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "key1", Json::Number(1.0));
    map::set(&mut doc, mk, "key1", Json::Number(2.0));
    assert_eq!(map::get(&doc, mk, "key1"), Some(Json::Number(2.0)));
}

#[test]
fn map_has_returns_true_for_existing() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "key1", Json::Number(1.0));
    assert!(map::has(&doc, mk, "key1"));
    assert!(!map::has(&doc, mk, "missing"));
}

#[test]
fn map_size() {
    let (mut doc, mk) = make_doc_with_map();
    assert_eq!(map::size(&doc, mk), 0);
    map::set(&mut doc, mk, "a", Json::Null);
    map::set(&mut doc, mk, "b", Json::Null);
    map::set(&mut doc, mk, "c", Json::Null);
    assert_eq!(map::size(&doc, mk), 3);
}

// ---- delete ----

#[test]
fn map_delete_removes_key() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "key1", Json::Number(1.0));
    assert!(map::delete(&mut doc, mk, "key1"));
    assert_eq!(map::get(&doc, mk, "key1"), None);
    assert!(!map::has(&doc, mk, "key1"));
}

#[test]
fn map_delete_nonexistent_returns_false() {
    let (mut doc, mk) = make_doc_with_map();
    assert!(!map::delete(&mut doc, mk, "missing"));
}

#[test]
fn map_delete_decrements_size() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "a", Json::Null);
    map::set(&mut doc, mk, "b", Json::Null);
    map::delete(&mut doc, mk, "a");
    assert_eq!(map::size(&doc, mk), 1);
}

// ---- keys / values / entries ----

#[test]
fn map_keys_returns_all_keys() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "a", Json::Null);
    map::set(&mut doc, mk, "b", Json::Null);
    map::set(&mut doc, mk, "c", Json::Null);

    let mut keys = map::keys(&doc, mk);
    keys.sort();
    assert_eq!(keys, vec!["a", "b", "c"]);
}

#[test]
fn map_values_returns_all_values() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "a", Json::Number(1.0));
    map::set(&mut doc, mk, "b", Json::Number(2.0));

    let mut values = map::values(&doc, mk);
    values.sort_by(|a, b| {
        let a_num = if let Json::Number(n) = a { *n } else { 0.0 };
        let b_num = if let Json::Number(n) = b { *n } else { 0.0 };
        a_num.partial_cmp(&b_num).unwrap()
    });
    assert_eq!(values, vec![Json::Number(1.0), Json::Number(2.0)]);
}

#[test]
fn map_entries_returns_key_value_pairs() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "x", Json::Number(10.0));
    map::set(&mut doc, mk, "y", Json::Number(20.0));

    let mut entries = map::entries(&doc, mk);
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0], ("x".to_string(), Json::Number(10.0)));
    assert_eq!(entries[1], ("y".to_string(), Json::Number(20.0)));
}

// ---- child CRDT nodes ----

#[test]
fn map_set_child_crdt_node() {
    let (mut doc, mk) = make_doc_with_map();
    let child_obj = doc.insert_node(CrdtNode::new_object("obj:0".into()));
    object::set_plain(&mut doc, child_obj, "inner", Json::Bool(true));
    map::set_child(&mut doc, mk, "nested", child_obj);

    let child_key = map::get_child(&doc, mk, "nested");
    assert!(child_key.is_some());
}

#[test]
fn map_get_returns_none_for_child_crdt_node() {
    let (mut doc, mk) = make_doc_with_map();
    let child_obj = doc.insert_node(CrdtNode::new_object("obj:0".into()));
    map::set_child(&mut doc, mk, "nested", child_obj);

    // get() returns plain values only, not child CRDT nodes
    assert_eq!(map::get(&doc, mk, "nested"), None);
    // but get_child returns the key
    assert!(map::get_child(&doc, mk, "nested").is_some());
}

// ---- toImmutable ----

#[test]
fn map_to_immutable_plain_values() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "a", Json::Number(1.0));
    map::set(&mut doc, mk, "b", Json::String("two".into()));

    let immutable = map::to_immutable(&doc, mk);
    match immutable {
        Some(Json::Object(obj)) => {
            assert_eq!(obj.get("a"), Some(&Json::Number(1.0)));
            assert_eq!(obj.get("b"), Some(&Json::String("two".into())));
        }
        _ => panic!("Expected Json::Object"),
    }
}

#[test]
fn map_to_immutable_nested() {
    let (mut doc, mk) = make_doc_with_map();
    let child_obj = doc.insert_node(CrdtNode::new_object("obj:0".into()));
    object::set_plain(&mut doc, child_obj, "x", Json::Number(42.0));
    map::set_child(&mut doc, mk, "nested", child_obj);

    let immutable = map::to_immutable(&doc, mk);
    match immutable {
        Some(Json::Object(obj)) => match obj.get("nested") {
            Some(Json::Object(inner)) => {
                assert_eq!(inner.get("x"), Some(&Json::Number(42.0)));
            }
            _ => panic!("Expected nested object"),
        },
        _ => panic!("Expected Json::Object"),
    }
}

// ---- to_ops ----

#[test]
fn map_to_ops_produces_create_map() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "key", Json::Number(1.0));

    let ops = map::to_ops(&doc, mk, "parent", "pkey");
    assert!(!ops.is_empty());
    assert_eq!(ops[0].op_code, OpCode::CreateMap);
    assert_eq!(ops[0].id, "map:0");
    assert_eq!(ops[0].parent_id, Some("parent".into()));
    assert_eq!(ops[0].parent_key, Some("pkey".into()));
}

#[test]
fn map_to_ops_includes_children() {
    let (mut doc, mk) = make_doc_with_map();
    map::set(&mut doc, mk, "a", Json::Number(1.0));
    map::set(&mut doc, mk, "b", Json::Number(2.0));

    let ops = map::to_ops(&doc, mk, "parent", "pkey");
    // CREATE_MAP + 2 CREATE_REGISTER ops
    assert_eq!(ops.len(), 3);
    assert_eq!(ops[0].op_code, OpCode::CreateMap);
}

// ---- edge cases ----

#[test]
fn map_operations_on_non_map_are_noop() {
    let mut doc = Document::new();
    let obj_key = doc.insert_node(CrdtNode::new_object("obj:0".into()));
    // These should not panic
    assert_eq!(map::get(&doc, obj_key, "key"), None);
    assert_eq!(map::size(&doc, obj_key), 0);
    assert!(!map::has(&doc, obj_key, "key"));
}

#[test]
fn map_empty_to_immutable() {
    let (doc, mk) = make_doc_with_map();
    let immutable = map::to_immutable(&doc, mk);
    match immutable {
        Some(Json::Object(obj)) => assert!(obj.is_empty()),
        _ => panic!("Expected empty Json::Object"),
    }
}
