use std::cell::RefCell;
use std::collections::BTreeMap;
use std::rc::Rc;

use wasm_bindgen::prelude::*;

use crate::arena::NodeKey;
use crate::crdt::{list, map, object};
use crate::document::Document;
use crate::ops::apply;
use crate::types::{Json, Op, OpSource, SerializedCrdt};

/// Shared document reference used by all handles.
pub(crate) type SharedDoc = Rc<RefCell<Document>>;

/// Convert a Json value to a JsValue via serde-wasm-bindgen.
///
/// Handles two serde-wasm-bindgen quirks:
/// - `Json::Null` must become `JsValue::NULL` (not `undefined`).
/// - BTreeMap must serialize as plain JS objects (not JS `Map`).
fn json_to_js(json: &Json) -> JsValue {
    match json {
        Json::Null => JsValue::NULL,
        _ => {
            use serde::Serialize;
            let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
            json.serialize(&serializer).unwrap_or(JsValue::UNDEFINED)
        }
    }
}

/// Convert a JsValue to a Json value via serde-wasm-bindgen.
fn js_to_json(val: JsValue) -> Json {
    serde_wasm_bindgen::from_value(val).unwrap_or(Json::Null)
}

// ============================================================
// LiveObjectHandle
// ============================================================

/// A handle to a LiveObject node, exported to JavaScript via wasm-bindgen.
#[wasm_bindgen]
pub struct LiveObjectHandle {
    doc: SharedDoc,
    key: NodeKey,
}

#[allow(dead_code)]
impl LiveObjectHandle {
    pub(crate) fn new(doc: SharedDoc, key: NodeKey) -> Self {
        Self { doc, key }
    }

    pub(crate) fn node_key(&self) -> NodeKey {
        self.key
    }
}

#[wasm_bindgen]
impl LiveObjectHandle {
    /// Get a property value by key. Returns `undefined` if missing.
    pub fn get(&self, key: &str) -> JsValue {
        let doc = self.doc.borrow();
        match object::get_plain(&doc, self.key, key) {
            Some(json) => json_to_js(json),
            None => JsValue::UNDEFINED,
        }
    }

    /// Set a property value.
    pub fn set(&self, key: &str, value: JsValue) {
        let mut doc = self.doc.borrow_mut();
        object::set_plain(&mut doc, self.key, key, js_to_json(value));
    }

    /// Update multiple properties at once from a JS object.
    pub fn update(&self, updates: JsValue) {
        if let Ok(map) = serde_wasm_bindgen::from_value::<BTreeMap<String, Json>>(updates) {
            let mut doc = self.doc.borrow_mut();
            for (k, v) in map {
                object::set_plain(&mut doc, self.key, &k, v);
            }
        }
    }

    /// Delete a property.
    pub fn delete(&self, key: &str) {
        let mut doc = self.doc.borrow_mut();
        object::delete_key(&mut doc, self.key, key);
    }

    /// Convert to a plain JS object (recursive, includes nested CRDT nodes).
    #[wasm_bindgen(js_name = "toObject")]
    pub fn to_object(&self) -> JsValue {
        let doc = self.doc.borrow();
        match object::to_immutable(&doc, self.key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    /// Convert to an immutable representation.
    #[wasm_bindgen(js_name = "toImmutable")]
    pub fn to_immutable(&self) -> JsValue {
        self.to_object()
    }

    /// Clone the handle (creates a new handle to the same underlying node).
    #[wasm_bindgen(js_name = "clone")]
    pub fn clone_handle(&self) -> LiveObjectHandle {
        LiveObjectHandle {
            doc: self.doc.clone(),
            key: self.key,
        }
    }

    /// Get the node ID.
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        let doc = self.doc.borrow();
        doc.get_node(self.key)
            .map(|n| n.id.clone())
            .unwrap_or_default()
    }

    /// Get the parent key.
    #[wasm_bindgen(getter, js_name = "parentKey")]
    pub fn parent_key(&self) -> Option<String> {
        let doc = self.doc.borrow();
        doc.get_node(self.key).and_then(|n| n.parent_key.clone())
    }
}

// ============================================================
// LiveListHandle
// ============================================================

/// A handle to a LiveList node, exported to JavaScript via wasm-bindgen.
#[wasm_bindgen]
pub struct LiveListHandle {
    doc: SharedDoc,
    key: NodeKey,
}

#[allow(dead_code)]
impl LiveListHandle {
    pub(crate) fn new(doc: SharedDoc, key: NodeKey) -> Self {
        Self { doc, key }
    }

    pub(crate) fn node_key(&self) -> NodeKey {
        self.key
    }
}

#[wasm_bindgen]
impl LiveListHandle {
    /// Get the value at a given index. Returns `undefined` if out of bounds.
    pub fn get(&self, index: usize) -> JsValue {
        let doc = self.doc.borrow();
        match list::get(&doc, self.key, index) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    /// Push a value to the end of the list.
    pub fn push(&self, value: JsValue) {
        let mut doc = self.doc.borrow_mut();
        list::push(&mut doc, self.key, js_to_json(value));
    }

    /// Insert a value at the given index.
    pub fn insert(&self, value: JsValue, index: usize) {
        let mut doc = self.doc.borrow_mut();
        list::insert(&mut doc, self.key, index, js_to_json(value));
    }

    /// Move an item from one index to another.
    #[wasm_bindgen(js_name = "move")]
    pub fn move_item(&self, from_index: usize, to_index: usize) {
        let mut doc = self.doc.borrow_mut();
        list::move_item(&mut doc, self.key, from_index, to_index);
    }

    /// Delete the item at the given index.
    pub fn delete(&self, index: usize) {
        let mut doc = self.doc.borrow_mut();
        list::delete(&mut doc, self.key, index);
    }

    /// Replace the value at the given index.
    pub fn set(&self, index: usize, value: JsValue) {
        let mut doc = self.doc.borrow_mut();
        list::set(&mut doc, self.key, index, js_to_json(value));
    }

    /// Clear all items from the list.
    pub fn clear(&self) {
        let mut doc = self.doc.borrow_mut();
        list::clear(&mut doc, self.key);
    }

    /// Get the number of items in the list.
    #[wasm_bindgen(getter)]
    pub fn length(&self) -> usize {
        let doc = self.doc.borrow();
        list::length(&doc, self.key)
    }

    /// Convert to a JS array of values.
    #[wasm_bindgen(js_name = "toArray")]
    pub fn to_array(&self) -> JsValue {
        let doc = self.doc.borrow();
        let arr = list::to_array(&doc, self.key);
        to_js(&arr).unwrap_or(JsValue::UNDEFINED)
    }

    /// Convert to an immutable representation.
    #[wasm_bindgen(js_name = "toImmutable")]
    pub fn to_immutable(&self) -> JsValue {
        let doc = self.doc.borrow();
        match list::to_immutable(&doc, self.key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    /// Clone the handle (creates a new handle to the same underlying node).
    #[wasm_bindgen(js_name = "clone")]
    pub fn clone_handle(&self) -> LiveListHandle {
        LiveListHandle {
            doc: self.doc.clone(),
            key: self.key,
        }
    }

    /// Get the node ID.
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        let doc = self.doc.borrow();
        doc.get_node(self.key)
            .map(|n| n.id.clone())
            .unwrap_or_default()
    }

    /// Get the parent key.
    #[wasm_bindgen(getter, js_name = "parentKey")]
    pub fn parent_key(&self) -> Option<String> {
        let doc = self.doc.borrow();
        doc.get_node(self.key).and_then(|n| n.parent_key.clone())
    }
}

// ============================================================
// LiveMapHandle
// ============================================================

/// A handle to a LiveMap node, exported to JavaScript via wasm-bindgen.
#[wasm_bindgen]
pub struct LiveMapHandle {
    doc: SharedDoc,
    key: NodeKey,
}

#[allow(dead_code)]
impl LiveMapHandle {
    pub(crate) fn new(doc: SharedDoc, key: NodeKey) -> Self {
        Self { doc, key }
    }

    pub(crate) fn node_key(&self) -> NodeKey {
        self.key
    }
}

#[wasm_bindgen]
impl LiveMapHandle {
    /// Get a value by key. Returns `undefined` if missing.
    pub fn get(&self, key: &str) -> JsValue {
        let doc = self.doc.borrow();
        match map::get(&doc, self.key, key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    /// Set a value at the given key.
    pub fn set(&self, key: &str, value: JsValue) {
        let mut doc = self.doc.borrow_mut();
        map::set(&mut doc, self.key, key, js_to_json(value));
    }

    /// Delete a key from the map. Returns true if the key existed.
    pub fn delete(&self, key: &str) -> bool {
        let mut doc = self.doc.borrow_mut();
        map::delete(&mut doc, self.key, key)
    }

    /// Check if a key exists in the map.
    pub fn has(&self, key: &str) -> bool {
        let doc = self.doc.borrow();
        map::has(&doc, self.key, key)
    }

    /// Get the number of entries in the map.
    #[wasm_bindgen(getter)]
    pub fn size(&self) -> usize {
        let doc = self.doc.borrow();
        map::size(&doc, self.key)
    }

    /// Get all entries as a JS array of `[key, value]` pairs.
    pub fn entries(&self) -> JsValue {
        let doc = self.doc.borrow();
        let entries = map::entries(&doc, self.key);
        let arr = js_sys::Array::new();
        for (k, v) in entries {
            let pair = js_sys::Array::new();
            pair.push(&JsValue::from_str(&k));
            pair.push(&json_to_js(&v));
            arr.push(&pair);
        }
        arr.into()
    }

    /// Get all keys as a JS array of strings.
    pub fn keys(&self) -> JsValue {
        let doc = self.doc.borrow();
        let keys = map::keys(&doc, self.key);
        let arr = js_sys::Array::new();
        for k in keys {
            arr.push(&JsValue::from_str(&k));
        }
        arr.into()
    }

    /// Get all values as a JS array.
    pub fn values(&self) -> JsValue {
        let doc = self.doc.borrow();
        let values = map::values(&doc, self.key);
        let arr = js_sys::Array::new();
        for v in values {
            arr.push(&json_to_js(&v));
        }
        arr.into()
    }

    /// Iterate over entries, calling the callback with `(value, key)` for each.
    #[wasm_bindgen(js_name = "forEach")]
    pub fn for_each(&self, callback: &js_sys::Function) {
        let doc = self.doc.borrow();
        let entries = map::entries(&doc, self.key);
        for (k, v) in entries {
            let js_key = JsValue::from_str(&k);
            let js_value = json_to_js(&v);
            // JS Map.forEach convention: callback(value, key)
            let _ = callback.call2(&JsValue::NULL, &js_value, &js_key);
        }
    }

    /// Convert to an immutable representation.
    #[wasm_bindgen(js_name = "toImmutable")]
    pub fn to_immutable(&self) -> JsValue {
        let doc = self.doc.borrow();
        match map::to_immutable(&doc, self.key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    /// Clone the handle (creates a new handle to the same underlying node).
    #[wasm_bindgen(js_name = "clone")]
    pub fn clone_handle(&self) -> LiveMapHandle {
        LiveMapHandle {
            doc: self.doc.clone(),
            key: self.key,
        }
    }

    /// Get the node ID.
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        let doc = self.doc.borrow();
        doc.get_node(self.key)
            .map(|n| n.id.clone())
            .unwrap_or_default()
    }

    /// Get the parent key.
    #[wasm_bindgen(getter, js_name = "parentKey")]
    pub fn parent_key(&self) -> Option<String> {
        let doc = self.doc.borrow();
        doc.get_node(self.key).and_then(|n| n.parent_key.clone())
    }
}

// ============================================================
// DocumentHandle
// ============================================================

/// A wasm-bindgen handle to a Document, exposing applyOp/applyOps to JS.
#[wasm_bindgen]
pub struct DocumentHandle {
    doc: SharedDoc,
}

impl Default for DocumentHandle {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl DocumentHandle {
    /// Create a new empty document with a root LiveObject.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let mut doc = Document::new();
        let root_node = crate::crdt::node::CrdtNode::new_object("root".to_string());
        doc.insert_root(root_node);
        Self {
            doc: Rc::new(RefCell::new(doc)),
        }
    }

    /// Apply a single operation to the document.
    ///
    /// `op_js` is a JS object matching the Op wire format.
    /// `source` is one of "local", "ours", "theirs".
    ///
    /// Returns a JS object:
    /// - `{ modified: false }` if the op was a no-op
    /// - `{ modified: true, reverse: Op[], update: StorageUpdate }` on success
    #[wasm_bindgen(js_name = "applyOp")]
    pub fn apply_op(&self, op_js: JsValue, source: &str) -> JsValue {
        let op: Op = match serde_wasm_bindgen::from_value(op_js) {
            Ok(o) => o,
            Err(_) => return JsValue::UNDEFINED,
        };
        let src = parse_op_source(source);
        let mut doc = self.doc.borrow_mut();
        let result = apply::apply_op(&mut doc, &op, src);
        apply_result_to_js(&result)
    }

    /// Apply a batch of operations to the document.
    ///
    /// `ops_js` is a JS array of Op objects.
    /// `source` is one of "local", "ours", "theirs".
    ///
    /// Returns a JS array of ApplyResult objects.
    #[wasm_bindgen(js_name = "applyOps")]
    pub fn apply_ops(&self, ops_js: JsValue, source: &str) -> JsValue {
        let ops: Vec<Op> = match serde_wasm_bindgen::from_value(ops_js) {
            Ok(o) => o,
            Err(_) => return JsValue::UNDEFINED,
        };
        let src = parse_op_source(source);
        let mut doc = self.doc.borrow_mut();
        let results = apply::apply_ops(&mut doc, &ops, src);
        let arr = js_sys::Array::new();
        for r in &results {
            arr.push(&apply_result_to_js(r));
        }
        arr.into()
    }

    /// Get a LiveObjectHandle for the root node.
    #[wasm_bindgen(getter)]
    pub fn root(&self) -> Option<LiveObjectHandle> {
        let doc = self.doc.borrow();
        doc.root_key()
            .map(|key| LiveObjectHandle::new(self.doc.clone(), key))
    }

    /// Initialize a document from a serialized storage snapshot.
    ///
    /// `items_js` is a JS array of `[id, SerializedCrdt]` tuples.
    #[wasm_bindgen(js_name = "fromItems")]
    pub fn from_items(items_js: JsValue) -> Self {
        let items: Vec<(String, SerializedCrdt)> =
            serde_wasm_bindgen::from_value(items_js).unwrap_or_default();
        let doc = crate::snapshot::deserialize(&items);
        Self {
            doc: Rc::new(RefCell::new(doc)),
        }
    }

    /// Serialize entire tree to storage snapshot format.
    ///
    /// Returns a JS array of `[id, SerializedCrdt]` tuples.
    pub fn serialize(&self) -> JsValue {
        let doc = self.doc.borrow();
        let items = crate::snapshot::serialize(&doc);
        to_js(&items).unwrap_or(JsValue::UNDEFINED)
    }

    /// Compute diff operations to reconcile this tree with a new snapshot.
    ///
    /// `new_items_js` is a JS array of `[id, SerializedCrdt]` tuples.
    /// Returns a JS array of Op objects.
    #[wasm_bindgen(js_name = "getTreesDiffOperations")]
    pub fn get_trees_diff_operations(&self, new_items_js: JsValue) -> JsValue {
        let new_items: Vec<(String, SerializedCrdt)> =
            serde_wasm_bindgen::from_value(new_items_js).unwrap_or_default();
        let doc = self.doc.borrow();
        let current_items = crate::snapshot::serialize(&doc);
        let ops = crate::tree_diff::get_trees_diff_operations(&current_items, &new_items);
        to_js(&ops).unwrap_or(JsValue::UNDEFINED)
    }

    /// Convert the root (or a subtree) to PlainLson format.
    ///
    /// Returns a JS value with `{liveblocksType, data}` wrappers.
    #[wasm_bindgen(js_name = "toPlainLson")]
    pub fn to_plain_lson(&self) -> JsValue {
        let doc = self.doc.borrow();
        let root_key = match doc.root_key() {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        match crate::snapshot::to_plain_lson(&doc, root_key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    /// Reset the document (drop all nodes, re-create root).
    #[wasm_bindgen(js_name = "reset")]
    pub fn reset(&self) {
        let mut doc = self.doc.borrow_mut();
        *doc = Document::new();
        let root_node = crate::crdt::node::CrdtNode::new_object("root".to_string());
        doc.insert_root(root_node);
    }

    /// Re-initialize the document from a serialized storage snapshot
    /// **without** creating a new handle.
    ///
    /// This reuses the existing `Rc<RefCell<Document>>` so that JS
    /// references to this handle remain valid.
    ///
    /// `items_js` is a JS array of `[id, SerializedCrdt]` tuples.
    #[wasm_bindgen(js_name = "initFromItems")]
    pub fn init_from_items(&self, items_js: JsValue) {
        let items: Vec<(String, SerializedCrdt)> =
            serde_wasm_bindgen::from_value(items_js).unwrap_or_default();
        let new_doc = crate::snapshot::deserialize(&items);
        *self.doc.borrow_mut() = new_doc;
    }
}

/// Parse an OpSource from a JS string.
fn parse_op_source(s: &str) -> OpSource {
    match s {
        "local" => OpSource::Local,
        "ours" => OpSource::Ours,
        "theirs" => OpSource::Theirs,
        _ => OpSource::Theirs,
    }
}

/// Serialize any value to JsValue with maps-as-objects enabled.
fn to_js<T: serde::Serialize>(val: &T) -> Result<JsValue, serde_wasm_bindgen::Error> {
    let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
    val.serialize(&serializer)
}

/// Convert an ApplyResult to a JsValue.
fn apply_result_to_js(result: &crate::types::ApplyResult) -> JsValue {
    use crate::types::ApplyResult;
    match result {
        ApplyResult::NotModified => {
            let obj = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&obj, &"modified".into(), &JsValue::FALSE);
            obj.into()
        }
        ApplyResult::Modified { reverse, update } => {
            let obj = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&obj, &"modified".into(), &JsValue::TRUE);

            // Serialize reverse ops
            let rev_arr = js_sys::Array::new();
            for op in reverse {
                if let Ok(js) = to_js(op) {
                    rev_arr.push(&js);
                }
            }
            let _ = js_sys::Reflect::set(&obj, &"reverse".into(), &rev_arr);

            // Serialize the update
            if let Ok(upd) = to_js(update) {
                let _ = js_sys::Reflect::set(&obj, &"update".into(), &upd);
            }

            obj.into()
        }
    }
}
