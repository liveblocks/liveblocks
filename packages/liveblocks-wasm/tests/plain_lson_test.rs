use liveblocks_wasm::crdt::node::CrdtNode;
use liveblocks_wasm::crdt::{list, map, object};
use liveblocks_wasm::document::Document;
use liveblocks_wasm::snapshot;
use liveblocks_wasm::types::Json;

fn make_doc_with_root() -> Document {
    let mut doc = Document::new();
    let root = CrdtNode::new_object("root".into());
    doc.insert_root(root);
    doc
}

// ---- Plain JSON pass-through ----

#[test]
fn plain_number_passes_through() {
    let doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();
    // Set a plain value and convert root to PlainLson
    // Plain values (registers) should appear as-is in the data
    let mut doc = doc;
    object::set_plain(&mut doc, root_key, "x", Json::Number(42.0));

    let result = snapshot::to_plain_lson(&doc, root_key);
    // Root should be wrapped as LiveObject
    match &result {
        Some(Json::Object(obj)) => {
            assert_eq!(
                obj.get("liveblocksType"),
                Some(&Json::String("LiveObject".to_string()))
            );
            // data should contain "x": 42.0
            match obj.get("data") {
                Some(Json::Object(data)) => {
                    assert_eq!(data.get("x"), Some(&Json::Number(42.0)));
                }
                _ => panic!("Expected data to be an object"),
            }
        }
        _ => panic!("Expected LiveObject wrapper"),
    }
}

// ---- LiveObject wrapping ----

#[test]
fn live_object_wraps_with_liveblocks_type() {
    let doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();
    let result = snapshot::to_plain_lson(&doc, root_key).unwrap();
    match result {
        Json::Object(obj) => {
            assert_eq!(
                obj.get("liveblocksType"),
                Some(&Json::String("LiveObject".to_string()))
            );
            assert!(obj.contains_key("data"));
        }
        _ => panic!("Expected Object"),
    }
}

// ---- LiveList wrapping ----

#[test]
fn live_list_wraps_with_liveblocks_type() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();

    // Create a list child
    let list_node = CrdtNode::new_list("list:0".into());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);

    // Add items to the list
    list::push(&mut doc, list_key, Json::Number(1.0));
    list::push(&mut doc, list_key, Json::Number(2.0));

    let result = snapshot::to_plain_lson(&doc, list_key).unwrap();
    match result {
        Json::Object(obj) => {
            assert_eq!(
                obj.get("liveblocksType"),
                Some(&Json::String("LiveList".to_string()))
            );
            match obj.get("data") {
                Some(Json::Array(arr)) => {
                    assert_eq!(arr.len(), 2);
                    assert_eq!(arr[0], Json::Number(1.0));
                    assert_eq!(arr[1], Json::Number(2.0));
                }
                _ => panic!("Expected data to be an array"),
            }
        }
        _ => panic!("Expected Object with liveblocksType"),
    }
}

// ---- LiveMap wrapping ----

#[test]
fn live_map_wraps_with_liveblocks_type() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();

    // Create a map child
    let map_node = CrdtNode::new_map("map:0".into());
    let map_key = doc.insert_node(map_node);
    object::set_child(&mut doc, root_key, "settings", map_key);

    // Add entries to the map
    map::set(&mut doc, map_key, "color", Json::String("red".to_string()));

    let result = snapshot::to_plain_lson(&doc, map_key).unwrap();
    match result {
        Json::Object(obj) => {
            assert_eq!(
                obj.get("liveblocksType"),
                Some(&Json::String("LiveMap".to_string()))
            );
            match obj.get("data") {
                Some(Json::Object(data)) => {
                    assert_eq!(data.get("color"), Some(&Json::String("red".to_string())));
                }
                _ => panic!("Expected data to be an object"),
            }
        }
        _ => panic!("Expected Object with liveblocksType"),
    }
}

// ---- Nested CRDT nodes ----

#[test]
fn nested_crdt_nodes_recursively_wrap() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();

    // Create nested object
    let child_obj = CrdtNode::new_object("obj:0".into());
    let child_key = doc.insert_node(child_obj);
    object::set_child(&mut doc, root_key, "child", child_key);
    object::set_plain(&mut doc, child_key, "inner", Json::Number(42.0));

    let result = snapshot::to_plain_lson(&doc, root_key).unwrap();
    match result {
        Json::Object(root_obj) => {
            assert_eq!(
                root_obj.get("liveblocksType"),
                Some(&Json::String("LiveObject".to_string()))
            );
            match root_obj.get("data") {
                Some(Json::Object(data)) => {
                    // "child" should also be wrapped as LiveObject
                    match data.get("child") {
                        Some(Json::Object(child_obj)) => {
                            assert_eq!(
                                child_obj.get("liveblocksType"),
                                Some(&Json::String("LiveObject".to_string()))
                            );
                            match child_obj.get("data") {
                                Some(Json::Object(child_data)) => {
                                    assert_eq!(child_data.get("inner"), Some(&Json::Number(42.0)));
                                }
                                _ => panic!("Expected child data object"),
                            }
                        }
                        _ => panic!("Expected child to be a LiveObject"),
                    }
                }
                _ => panic!("Expected data object"),
            }
        }
        _ => panic!("Expected Object"),
    }
}

// ---- Full root conversion ----

#[test]
fn root_with_mixed_children() {
    let mut doc = make_doc_with_root();
    let root_key = doc.root_key().unwrap();

    // Add plain value
    object::set_plain(&mut doc, root_key, "name", Json::String("test".to_string()));

    // Add list child
    let list_node = CrdtNode::new_list("list:0".into());
    let list_key = doc.insert_node(list_node);
    object::set_child(&mut doc, root_key, "items", list_key);
    list::push(&mut doc, list_key, Json::Number(1.0));

    let result = snapshot::to_plain_lson(&doc, root_key).unwrap();
    match result {
        Json::Object(obj) => {
            assert_eq!(
                obj.get("liveblocksType"),
                Some(&Json::String("LiveObject".to_string()))
            );
            let data = match obj.get("data") {
                Some(Json::Object(d)) => d,
                _ => panic!("Expected data object"),
            };
            // Plain value should pass through
            assert_eq!(data.get("name"), Some(&Json::String("test".to_string())));
            // List should be wrapped
            match data.get("items") {
                Some(Json::Object(list_obj)) => {
                    assert_eq!(
                        list_obj.get("liveblocksType"),
                        Some(&Json::String("LiveList".to_string()))
                    );
                }
                _ => panic!("Expected items to be a LiveList"),
            }
        }
        _ => panic!("Expected Object"),
    }
}
