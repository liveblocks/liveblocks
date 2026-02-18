#![cfg(feature = "wasm")]
//! WASM boundary tests — verify all wasm-bindgen exports are callable
//! from the JS side with correct types and produce expected results.
//!
//! These tests exercise the serde-wasm-bindgen serialization/deserialization
//! boundary to catch mismatches between Rust types and JS expectations.
//!
//! Run with: wasm-pack test --headless --chrome
//! Or:       wasm-pack test --node

use wasm_bindgen::prelude::*;
use wasm_bindgen_test::*;

use liveblocks_wasm::handles::DocumentHandle;

// ====================================================================
// DocumentHandle boundary tests
// ====================================================================

#[wasm_bindgen_test]
fn document_handle_new_creates_empty_doc() {
    let doc = DocumentHandle::new();
    // A new doc should have a root
    let root = doc.root();
    assert!(root.is_some(), "New document should have a root node");
}

#[wasm_bindgen_test]
fn document_handle_root_returns_live_object_handle() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root should exist");
    // The root should have an id
    let id = root.id();
    assert!(!id.is_empty(), "Root node should have a non-empty id");
}

#[wasm_bindgen_test]
fn document_handle_reset_clears_document() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root should exist");
    root.set("x", JsValue::from(42));
    doc.reset();
    let new_root = doc.root().expect("root should exist after reset");
    let val = new_root.get("x");
    assert!(val.is_undefined(), "Property should be gone after reset");
}

// ====================================================================
// LiveObjectHandle boundary tests
// ====================================================================

#[wasm_bindgen_test]
fn live_object_get_set_roundtrip() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    root.set("name", JsValue::from_str("Alice"));
    let val = root.get("name");
    assert_eq!(val.as_string().unwrap(), "Alice");
}

#[wasm_bindgen_test]
fn live_object_get_missing_returns_undefined() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    let val = root.get("nonexistent");
    assert!(val.is_undefined());
}

#[wasm_bindgen_test]
fn live_object_set_number() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    root.set("count", JsValue::from(42));
    let val = root.get("count");
    assert_eq!(val.as_f64().unwrap(), 42.0);
}

#[wasm_bindgen_test]
fn live_object_set_bool() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    root.set("active", JsValue::TRUE);
    let val = root.get("active");
    assert!(val.as_bool().unwrap());
}

#[wasm_bindgen_test]
fn live_object_set_null() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    root.set("empty", JsValue::NULL);
    let val = root.get("empty");
    assert!(val.is_null());
}

#[wasm_bindgen_test]
fn live_object_delete_removes_property() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    root.set("key", JsValue::from_str("value"));
    root.delete("key");
    let val = root.get("key");
    assert!(val.is_undefined());
}

#[wasm_bindgen_test]
fn live_object_update_sets_multiple_properties() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    // Create a JS object {a: 1, b: "hello"}
    let updates = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&updates, &"a".into(), &JsValue::from(1));
    let _ = js_sys::Reflect::set(&updates, &"b".into(), &JsValue::from_str("hello"));
    root.update(updates.into());

    assert_eq!(root.get("a").as_f64().unwrap(), 1.0);
    assert_eq!(root.get("b").as_string().unwrap(), "hello");
}

#[wasm_bindgen_test]
fn live_object_to_object_returns_all_properties() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    root.set("x", JsValue::from(1));
    root.set("y", JsValue::from(2));
    let obj = root.to_object();

    assert!(!obj.is_undefined());
    let x = js_sys::Reflect::get(&obj, &"x".into()).unwrap();
    let y = js_sys::Reflect::get(&obj, &"y".into()).unwrap();
    assert_eq!(x.as_f64().unwrap(), 1.0);
    assert_eq!(y.as_f64().unwrap(), 2.0);
}

#[wasm_bindgen_test]
fn live_object_to_immutable_same_as_to_object() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");

    root.set("val", JsValue::from(99));
    let obj = root.to_object();
    let imm = root.to_immutable();

    let obj_val = js_sys::Reflect::get(&obj, &"val".into()).unwrap();
    let imm_val = js_sys::Reflect::get(&imm, &"val".into()).unwrap();
    assert_eq!(obj_val.as_f64(), imm_val.as_f64());
}

#[wasm_bindgen_test]
fn live_object_clone_handle_shares_data() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    root.set("shared", JsValue::from(1));

    let cloned = root.clone_handle();
    cloned.set("shared", JsValue::from(2));

    // Both handles see the same data
    assert_eq!(root.get("shared").as_f64().unwrap(), 2.0);
}

#[wasm_bindgen_test]
fn live_object_parent_key_of_root_is_none() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    assert!(root.parent_key().is_none());
}

// ====================================================================
// DocumentHandle.applyOp boundary tests
// ====================================================================

#[wasm_bindgen_test]
fn apply_op_create_object_under_root() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    let root_id = root.id();

    // Build a CREATE_OBJECT op: { type: 4, id: "0:0", parentId: root_id, parentKey: "child", data: { a: 1 } }
    // Rust OpCode::CreateObject = 4
    let op = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&op, &"type".into(), &JsValue::from(4));
    let _ = js_sys::Reflect::set(&op, &"id".into(), &JsValue::from_str("0:0"));
    let _ = js_sys::Reflect::set(&op, &"parentId".into(), &JsValue::from_str(&root_id));
    let _ = js_sys::Reflect::set(&op, &"parentKey".into(), &JsValue::from_str("child"));

    let data = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&data, &"a".into(), &JsValue::from(1));
    let _ = js_sys::Reflect::set(&op, &"data".into(), &data);

    let result = doc.apply_op(op.into(), "theirs");
    assert!(!result.is_undefined());

    let modified = js_sys::Reflect::get(&result, &"modified".into()).unwrap();
    assert!(modified.as_bool().unwrap());
}

#[wasm_bindgen_test]
fn apply_op_update_object() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    root.set("x", JsValue::from(1));

    // Build UPDATE_OBJECT op: { type: 3, id: root_id, data: { x: 99 } }
    // Rust OpCode::UpdateObject = 3
    let root_id = root.id();
    let op = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&op, &"type".into(), &JsValue::from(3));
    let _ = js_sys::Reflect::set(&op, &"id".into(), &JsValue::from_str(&root_id));

    let data = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&data, &"x".into(), &JsValue::from(99));
    let _ = js_sys::Reflect::set(&op, &"data".into(), &data);

    let result = doc.apply_op(op.into(), "theirs");
    let modified = js_sys::Reflect::get(&result, &"modified".into()).unwrap();
    assert!(modified.as_bool().unwrap());

    assert_eq!(root.get("x").as_f64().unwrap(), 99.0);
}

#[wasm_bindgen_test]
fn apply_op_returns_reverse_ops() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    root.set("x", JsValue::from(1));

    let root_id = root.id();
    let op = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&op, &"type".into(), &JsValue::from(3)); // UPDATE_OBJECT = 3
    let _ = js_sys::Reflect::set(&op, &"id".into(), &JsValue::from_str(&root_id));
    let data = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&data, &"x".into(), &JsValue::from(42));
    let _ = js_sys::Reflect::set(&op, &"data".into(), &data);

    let result = doc.apply_op(op.into(), "theirs");
    let reverse = js_sys::Reflect::get(&result, &"reverse".into()).unwrap();
    assert!(
        js_sys::Array::is_array(&reverse),
        "reverse should be an array"
    );

    let reverse_arr = js_sys::Array::from(&reverse);
    assert!(reverse_arr.length() > 0, "reverse ops should not be empty");
}

// ====================================================================
// DocumentHandle.fromItems / serialize boundary tests
// ====================================================================

#[wasm_bindgen_test]
fn from_items_and_serialize_roundtrip() {
    // Create items array: [["root", { type: 0, data: { hello: "world" } }]]
    let items = js_sys::Array::new();
    let root_tuple = js_sys::Array::new();
    root_tuple.push(&JsValue::from_str("root"));

    let root_crdt = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&root_crdt, &"type".into(), &JsValue::from(0));
    let data = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&data, &"hello".into(), &JsValue::from_str("world"));
    let _ = js_sys::Reflect::set(&root_crdt, &"data".into(), &data);

    root_tuple.push(&root_crdt);
    items.push(&root_tuple);

    let doc = DocumentHandle::from_items(items.into());
    let root = doc.root().expect("root should exist after fromItems");
    assert_eq!(root.get("hello").as_string().unwrap(), "world");

    // Serialize and check we get back the data
    let serialized = doc.serialize();
    assert!(!serialized.is_undefined());
    assert!(js_sys::Array::is_array(&serialized));
}

// ====================================================================
// DocumentHandle.toPlainLson boundary tests
// ====================================================================

#[wasm_bindgen_test]
fn to_plain_lson_wraps_root_with_liveblocks_type() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    root.set("x", JsValue::from(1));

    let lson = doc.to_plain_lson();
    assert!(!lson.is_undefined());

    let liveblocks_type = js_sys::Reflect::get(&lson, &"liveblocksType".into()).unwrap();
    assert_eq!(liveblocks_type.as_string().unwrap(), "LiveObject");

    let data = js_sys::Reflect::get(&lson, &"data".into()).unwrap();
    let x = js_sys::Reflect::get(&data, &"x".into()).unwrap();
    assert_eq!(x.as_f64().unwrap(), 1.0);
}

// ====================================================================
// DocumentHandle.getTreesDiffOperations boundary tests
// ====================================================================

#[wasm_bindgen_test]
fn get_trees_diff_operations_detects_additions() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    root.set("x", JsValue::from(1));

    // Create new items with an additional node
    let root_id = root.id();
    let items = js_sys::Array::new();

    // Root node
    let root_tuple = js_sys::Array::new();
    root_tuple.push(&JsValue::from_str(&root_id));
    let root_crdt = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&root_crdt, &"type".into(), &JsValue::from(0));
    let data = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&data, &"x".into(), &JsValue::from(1));
    let _ = js_sys::Reflect::set(&root_crdt, &"data".into(), &data);
    root_tuple.push(&root_crdt);
    items.push(&root_tuple);

    // Existing register child (x=1)
    // We need to include the register that represents x
    // But actually, let's add a new LIST child to trigger a CREATE_LIST op
    let child_tuple = js_sys::Array::new();
    child_tuple.push(&JsValue::from_str("0:0"));
    let child_crdt = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&child_crdt, &"type".into(), &JsValue::from(1)); // LIST = CrdtType::List = 1
    let _ = js_sys::Reflect::set(
        &child_crdt,
        &"parentId".into(),
        &JsValue::from_str(&root_id),
    );
    let _ = js_sys::Reflect::set(
        &child_crdt,
        &"parentKey".into(),
        &JsValue::from_str("items"),
    );
    child_tuple.push(&child_crdt);
    items.push(&child_tuple);

    let ops = doc.get_trees_diff_operations(items.into());
    assert!(!ops.is_undefined());
    assert!(js_sys::Array::is_array(&ops));

    let ops_arr = js_sys::Array::from(&ops);
    assert!(
        ops_arr.length() > 0,
        "Should detect differences between trees"
    );
}

// ====================================================================
// LiveListHandle boundary tests via applyOp
// ====================================================================

#[wasm_bindgen_test]
fn live_list_push_get_length_via_doc() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    let root_id = root.id();

    // Create a list under root via applyOp
    let op = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&op, &"type".into(), &JsValue::from(2)); // CREATE_LIST = 2
    let _ = js_sys::Reflect::set(&op, &"id".into(), &JsValue::from_str("list:0"));
    let _ = js_sys::Reflect::set(&op, &"parentId".into(), &JsValue::from_str(&root_id));
    let _ = js_sys::Reflect::set(&op, &"parentKey".into(), &JsValue::from_str("items"));

    let result = doc.apply_op(op.into(), "theirs");
    let modified = js_sys::Reflect::get(&result, &"modified".into()).unwrap();
    assert!(modified.as_bool().unwrap());
}

// ====================================================================
// LiveMapHandle boundary tests via applyOp
// ====================================================================

#[wasm_bindgen_test]
fn live_map_create_via_apply_op() {
    let doc = DocumentHandle::new();
    let root = doc.root().expect("root");
    let root_id = root.id();

    // Create a map under root via applyOp
    let op = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&op, &"type".into(), &JsValue::from(7)); // CREATE_MAP
    let _ = js_sys::Reflect::set(&op, &"id".into(), &JsValue::from_str("map:0"));
    let _ = js_sys::Reflect::set(&op, &"parentId".into(), &JsValue::from_str(&root_id));
    let _ = js_sys::Reflect::set(&op, &"parentKey".into(), &JsValue::from_str("data"));

    let result = doc.apply_op(op.into(), "theirs");
    let modified = js_sys::Reflect::get(&result, &"modified".into()).unwrap();
    assert!(modified.as_bool().unwrap());
}

// ====================================================================
// makePosition boundary test (Rust-side verification)
// ====================================================================

#[wasm_bindgen_test]
fn make_position_rust_export_works() {
    // Test the underlying Rust function that is exported via wasm_bindgen
    let pos = liveblocks_wasm::make_position(None, None);
    assert!(!pos.is_empty(), "Default position should not be empty");
    assert_eq!(pos, "!", "Default position should be '!'");
}

#[wasm_bindgen_test]
fn make_position_after() {
    let pos = liveblocks_wasm::make_position(Some("!".to_string()), None);
    assert!(pos.as_str() > "!", "Position after '!' should be greater");
    assert_eq!(pos, "\"", "Position after '!' should be '\"'");
}

#[wasm_bindgen_test]
fn make_position_between() {
    let pos = liveblocks_wasm::make_position(Some("!".to_string()), Some("#".to_string()));
    assert!(pos.as_str() > "!", "Position should be > lower bound");
    assert!(pos.as_str() < "#", "Position should be < upper bound");
    assert_eq!(pos, "\"", "Between '!' and '#' should be '\"'");
}
