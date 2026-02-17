use liveblocks_wasm::crdt::list;
use liveblocks_wasm::crdt::node::CrdtNode;
use liveblocks_wasm::crdt::object;
use liveblocks_wasm::document::Document;
use liveblocks_wasm::types::{Json, OpCode};

fn make_doc_with_list() -> (Document, liveblocks_wasm::arena::NodeKey) {
    let mut doc = Document::new();
    let list_key = doc.insert_node(CrdtNode::new_list("list:0".into()));
    (doc, list_key)
}

// ---- basic operations ----

#[test]
fn list_push_and_length() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::Number(2.0));
    list::push(&mut doc, lk, Json::Number(3.0));
    assert_eq!(list::length(&doc, lk), 3);
}

#[test]
fn list_get_returns_values_in_order() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::String("a".into()));
    list::push(&mut doc, lk, Json::String("b".into()));
    list::push(&mut doc, lk, Json::String("c".into()));

    assert_eq!(list::get(&doc, lk, 0), Some(Json::String("a".into())));
    assert_eq!(list::get(&doc, lk, 1), Some(Json::String("b".into())));
    assert_eq!(list::get(&doc, lk, 2), Some(Json::String("c".into())));
    assert_eq!(list::get(&doc, lk, 3), None);
}

#[test]
fn list_insert_at_beginning() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(2.0));
    list::push(&mut doc, lk, Json::Number(3.0));
    list::insert(&mut doc, lk, 0, Json::Number(1.0));

    assert_eq!(list::get(&doc, lk, 0), Some(Json::Number(1.0)));
    assert_eq!(list::get(&doc, lk, 1), Some(Json::Number(2.0)));
    assert_eq!(list::get(&doc, lk, 2), Some(Json::Number(3.0)));
}

#[test]
fn list_insert_in_middle() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::Number(3.0));
    list::insert(&mut doc, lk, 1, Json::Number(2.0));

    assert_eq!(list::get(&doc, lk, 0), Some(Json::Number(1.0)));
    assert_eq!(list::get(&doc, lk, 1), Some(Json::Number(2.0)));
    assert_eq!(list::get(&doc, lk, 2), Some(Json::Number(3.0)));
}

#[test]
fn list_delete_by_index() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::Number(2.0));
    list::push(&mut doc, lk, Json::Number(3.0));

    list::delete(&mut doc, lk, 1);

    assert_eq!(list::length(&doc, lk), 2);
    assert_eq!(list::get(&doc, lk, 0), Some(Json::Number(1.0)));
    assert_eq!(list::get(&doc, lk, 1), Some(Json::Number(3.0)));
}

#[test]
fn list_move_item() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::String("a".into()));
    list::push(&mut doc, lk, Json::String("b".into()));
    list::push(&mut doc, lk, Json::String("c".into()));

    // Move "a" (index 0) to index 2
    list::move_item(&mut doc, lk, 0, 2);

    assert_eq!(list::get(&doc, lk, 0), Some(Json::String("b".into())));
    assert_eq!(list::get(&doc, lk, 1), Some(Json::String("c".into())));
    assert_eq!(list::get(&doc, lk, 2), Some(Json::String("a".into())));
}

#[test]
fn list_set_replaces_item() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::Number(2.0));
    list::push(&mut doc, lk, Json::Number(3.0));

    list::set(&mut doc, lk, 1, Json::Number(20.0));

    assert_eq!(list::get(&doc, lk, 0), Some(Json::Number(1.0)));
    assert_eq!(list::get(&doc, lk, 1), Some(Json::Number(20.0)));
    assert_eq!(list::get(&doc, lk, 2), Some(Json::Number(3.0)));
}

// ---- to_array ----

#[test]
fn list_to_array_returns_all_values() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::Number(2.0));
    list::push(&mut doc, lk, Json::Number(3.0));

    let arr = list::to_array(&doc, lk);
    assert_eq!(
        arr,
        vec![Json::Number(1.0), Json::Number(2.0), Json::Number(3.0)]
    );
}

#[test]
fn list_to_array_empty() {
    let (doc, lk) = make_doc_with_list();
    let arr = list::to_array(&doc, lk);
    assert!(arr.is_empty());
}

// ---- toImmutable ----

#[test]
fn list_to_immutable_plain_values() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::String("two".into()));

    let immutable = list::to_immutable(&doc, lk);
    match immutable {
        Some(Json::Array(items)) => {
            assert_eq!(items.len(), 2);
            assert_eq!(items[0], Json::Number(1.0));
            assert_eq!(items[1], Json::String("two".into()));
        }
        _ => panic!("Expected Json::Array"),
    }
}

#[test]
fn list_to_immutable_nested_object() {
    let (mut doc, lk) = make_doc_with_list();
    // Insert a nested LiveObject as a child
    let child_obj = doc.insert_node(CrdtNode::new_object("obj:0".into()));
    object::set_plain(&mut doc, child_obj, "x", Json::Number(42.0));
    list::push_child(&mut doc, lk, child_obj);

    let immutable = list::to_immutable(&doc, lk);
    match immutable {
        Some(Json::Array(items)) => {
            assert_eq!(items.len(), 1);
            match &items[0] {
                Json::Object(map) => {
                    assert_eq!(map.get("x"), Some(&Json::Number(42.0)));
                }
                _ => panic!("Expected nested object"),
            }
        }
        _ => panic!("Expected Json::Array"),
    }
}

// ---- to_ops ----

#[test]
fn list_to_ops_produces_create_list() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));

    let ops = list::to_ops(&doc, lk, "parent", "key");
    assert!(!ops.is_empty());
    assert_eq!(ops[0].op_code, OpCode::CreateList);
    assert_eq!(ops[0].id, "list:0");
    assert_eq!(ops[0].parent_id, Some("parent".into()));
    assert_eq!(ops[0].parent_key, Some("key".into()));
}

#[test]
fn list_to_ops_includes_children() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::Number(2.0));

    let ops = list::to_ops(&doc, lk, "parent", "key");
    // CREATE_LIST + 2 CREATE_REGISTER ops
    assert_eq!(ops.len(), 3);
    assert_eq!(ops[0].op_code, OpCode::CreateList);
    assert_eq!(ops[1].op_code, OpCode::CreateRegister);
    assert_eq!(ops[2].op_code, OpCode::CreateRegister);
}

// ---- positions are maintained ----

#[test]
fn list_maintains_insertion_order() {
    let (mut doc, lk) = make_doc_with_list();
    for i in 0..10 {
        list::push(&mut doc, lk, Json::Number(i as f64));
    }

    for i in 0..10 {
        assert_eq!(list::get(&doc, lk, i), Some(Json::Number(i as f64)));
    }
}

#[test]
fn list_clear_removes_all() {
    let (mut doc, lk) = make_doc_with_list();
    list::push(&mut doc, lk, Json::Number(1.0));
    list::push(&mut doc, lk, Json::Number(2.0));
    list::push(&mut doc, lk, Json::Number(3.0));

    list::clear(&mut doc, lk);
    assert_eq!(list::length(&doc, lk), 0);
}

// ---- edge cases ----

#[test]
fn list_operations_on_non_list_are_noop() {
    let mut doc = Document::new();
    let obj_key = doc.insert_node(CrdtNode::new_object("obj:0".into()));
    // These should not panic
    assert_eq!(list::length(&doc, obj_key), 0);
    assert_eq!(list::get(&doc, obj_key, 0), None);
    list::push(&mut doc, obj_key, Json::Null);
    assert_eq!(list::length(&doc, obj_key), 0); // Should still be 0 - wrong node type
}

#[test]
fn list_push_child_crdt_node() {
    let (mut doc, lk) = make_doc_with_list();
    let nested_list = doc.insert_node(CrdtNode::new_list("nested:0".into()));
    list::push_child(&mut doc, lk, nested_list);

    assert_eq!(list::length(&doc, lk), 1);
}
