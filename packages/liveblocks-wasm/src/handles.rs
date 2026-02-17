use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::rc::Rc;

use wasm_bindgen::prelude::*;

use crate::arena::NodeKey;
use crate::crdt::node::CrdtData;
use crate::crdt::{list, map, object};
use crate::document::Document;
use crate::id_gen::IdGenerator;
use crate::ops::apply;
use crate::ops::serialize::{
    create_register_op, delete_crdt_op, delete_object_key_op, set_parent_key_op, update_object_op,
};
use crate::types::{Json, MutationResult, Op, OpSource, SerializedCrdt};
use crate::updates::{ListUpdateEntry, StorageUpdate, UpdateDelta};

/// Shared document reference used by all handles.
pub(crate) type SharedDoc = Rc<RefCell<Document>>;

/// Shared ID generator reference used by all handles.
pub(crate) type SharedIdGen = Rc<RefCell<IdGenerator>>;

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

/// Serialize any value to JsValue with maps-as-objects enabled.
fn to_js<T: serde::Serialize>(val: &T) -> Result<JsValue, serde_wasm_bindgen::Error> {
    let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
    val.serialize(&serializer)
}

/// Serialize a MutationResult to JsValue.
fn mutation_result_to_js(result: &MutationResult) -> JsValue {
    to_js(result).unwrap_or(JsValue::UNDEFINED)
}

// ============================================================
// LiveObjectHandle
// ============================================================

/// A handle to a LiveObject node, exported to JavaScript via wasm-bindgen.
#[wasm_bindgen]
pub struct LiveObjectHandle {
    doc: SharedDoc,
    key: NodeKey,
    id_gen: SharedIdGen,
}

#[allow(dead_code)]
impl LiveObjectHandle {
    pub(crate) fn new(doc: SharedDoc, key: NodeKey, id_gen: SharedIdGen) -> Self {
        Self { doc, key, id_gen }
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
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn set(&self, key: &str, value: JsValue) -> JsValue {
        let value = js_to_json(value);

        // Capture pre-mutation state
        let (node_id, old_value) = {
            let doc = self.doc.borrow();
            let node_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = object::get_plain(&doc, self.key, key).cloned();
            (node_id, old_value)
        };

        // Generate op_id
        let op_id = self.id_gen.borrow_mut().generate_op_id();

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            object::set_plain(&mut doc, self.key, key, value.clone());
        }

        // Forward op
        let mut fwd_data = BTreeMap::new();
        fwd_data.insert(key.to_string(), value.clone());
        let mut fwd_op = update_object_op(&node_id, fwd_data);
        fwd_op.op_id = Some(op_id);

        // Reverse ops
        let reverse_ops = if let Some(old_val) = &old_value {
            let mut rev_data = BTreeMap::new();
            rev_data.insert(key.to_string(), old_val.clone());
            vec![update_object_op(&node_id, rev_data)]
        } else {
            vec![delete_object_key_op(&node_id, key)]
        };

        // Update
        let mut updates = HashMap::new();
        updates.insert(
            key.to_string(),
            UpdateDelta::Set {
                old_value,
                new_value: value,
            },
        );

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveObjectUpdate { node_id, updates },
        })
    }

    /// Update multiple properties at once from a JS object.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn update(&self, updates: JsValue) -> JsValue {
        let map = match serde_wasm_bindgen::from_value::<BTreeMap<String, Json>>(updates) {
            Ok(m) => m,
            Err(_) => return JsValue::UNDEFINED,
        };

        if map.is_empty() {
            return JsValue::UNDEFINED;
        }

        // Capture pre-mutation state
        let (node_id, old_values) = {
            let doc = self.doc.borrow();
            let node_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_values: BTreeMap<String, Option<Json>> = map
                .keys()
                .map(|k| (k.clone(), object::get_plain(&doc, self.key, k).cloned()))
                .collect();
            (node_id, old_values)
        };

        // Generate one shared op_id for all keys
        let op_id = self.id_gen.borrow_mut().generate_op_id();

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            for (k, v) in &map {
                object::set_plain(&mut doc, self.key, k, v.clone());
            }
        }

        // Forward op: single UPDATE_OBJECT with all key-value pairs
        let mut fwd_op = update_object_op(&node_id, map.clone());
        fwd_op.op_id = Some(op_id);

        // Reverse ops: per-key reverse
        let mut rev_update_data = BTreeMap::new();
        let mut rev_delete_ops = Vec::new();
        for (k, old_val) in &old_values {
            if let Some(val) = old_val {
                rev_update_data.insert(k.clone(), val.clone());
            } else {
                rev_delete_ops.push(delete_object_key_op(&node_id, k));
            }
        }
        let mut reverse_ops = Vec::new();
        if !rev_update_data.is_empty() {
            reverse_ops.push(update_object_op(&node_id, rev_update_data));
        }
        reverse_ops.extend(rev_delete_ops);

        // Update deltas
        let mut update_deltas = HashMap::new();
        for (k, v) in &map {
            let old_value = old_values.get(k).and_then(|o| o.clone());
            update_deltas.insert(
                k.clone(),
                UpdateDelta::Set {
                    old_value,
                    new_value: v.clone(),
                },
            );
        }

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveObjectUpdate {
                node_id,
                updates: update_deltas,
            },
        })
    }

    /// Delete a property.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn delete(&self, key: &str) -> JsValue {
        // Capture pre-mutation state
        let (node_id, _old_value, reverse_ops, update_delta) = {
            let doc = self.doc.borrow();
            let node_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = object::get_plain(&doc, self.key, key).cloned();
            let has_child = object::get_child(&doc, self.key, key).is_some();

            if old_value.is_none() && !has_child {
                return JsValue::UNDEFINED;
            }

            // Build reverse ops BEFORE mutation
            let reverse_ops = if let Some(ref val) = old_value {
                // Plain value: reverse is UPDATE_OBJECT with old value
                let mut rev_data = BTreeMap::new();
                rev_data.insert(key.to_string(), val.clone());
                vec![update_object_op(&node_id, rev_data)]
            } else if let Some(child_key) = object::get_child(&doc, self.key, key) {
                // Nested CRDT child: reverse is full CREATE chain
                apply::generate_create_ops_for_subtree(&doc, child_key)
            } else {
                vec![]
            };

            let update_delta = if let Some(ref val) = old_value {
                UpdateDelta::Delete {
                    old_value: val.clone(),
                }
            } else {
                UpdateDelta::Delete {
                    old_value: Json::Null,
                }
            };

            (node_id, old_value, reverse_ops, update_delta)
        };

        // Generate op_id
        let op_id = self.id_gen.borrow_mut().generate_op_id();

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            object::delete_key(&mut doc, self.key, key);
        }

        // Forward op
        let mut fwd_op = delete_object_key_op(&node_id, key);
        fwd_op.op_id = Some(op_id);

        let mut update_map = HashMap::new();
        update_map.insert(key.to_string(), update_delta);

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveObjectUpdate {
                node_id,
                updates: update_map,
            },
        })
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
            id_gen: self.id_gen.clone(),
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
    id_gen: SharedIdGen,
}

#[allow(dead_code)]
impl LiveListHandle {
    pub(crate) fn new(doc: SharedDoc, key: NodeKey, id_gen: SharedIdGen) -> Self {
        Self { doc, key, id_gen }
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
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn push(&self, value: JsValue) -> JsValue {
        let value = js_to_json(value);

        // Capture pre-mutation state
        let (list_id, old_length) = {
            let doc = self.doc.borrow();
            let list_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_length = list::length(&doc, self.key);
            (list_id, old_length)
        };

        // Generate IDs
        let (reg_id, op_id) = {
            let mut id_gen = self.id_gen.borrow_mut();
            (id_gen.generate_id(), id_gen.generate_op_id())
        };

        // Mutate tree
        let info = {
            let mut doc = self.doc.borrow_mut();
            list::push_with_id(&mut doc, self.key, value.clone(), &reg_id)
        };

        // Forward op
        let mut fwd_op = create_register_op(&reg_id, &list_id, &info.position, value.clone());
        fwd_op.op_id = Some(op_id);

        // Reverse op: DELETE_CRDT to undo the push
        let reverse_ops = vec![delete_crdt_op(&reg_id)];

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveListUpdate {
                node_id: list_id,
                updates: vec![ListUpdateEntry::Insert {
                    index: old_length,
                    value,
                }],
            },
        })
    }

    /// Insert a value at the given index.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn insert(&self, value: JsValue, index: usize) -> JsValue {
        let value = js_to_json(value);

        let list_id = {
            let doc = self.doc.borrow();
            doc.get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default()
        };

        // Generate IDs
        let (reg_id, op_id) = {
            let mut id_gen = self.id_gen.borrow_mut();
            (id_gen.generate_id(), id_gen.generate_op_id())
        };

        // Mutate tree
        let info = {
            let mut doc = self.doc.borrow_mut();
            list::insert_with_id(&mut doc, self.key, index, value.clone(), &reg_id)
        };

        // Forward op
        let mut fwd_op = create_register_op(&reg_id, &list_id, &info.position, value.clone());
        fwd_op.op_id = Some(op_id);

        // Reverse op: DELETE_CRDT to undo the insert
        let reverse_ops = vec![delete_crdt_op(&reg_id)];

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveListUpdate {
                node_id: list_id,
                updates: vec![ListUpdateEntry::Insert { index, value }],
            },
        })
    }

    /// Move an item from one index to another.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    #[wasm_bindgen(js_name = "move")]
    pub fn move_item(&self, from_index: usize, to_index: usize) -> JsValue {
        if from_index == to_index {
            return JsValue::UNDEFINED;
        }

        // Capture pre-mutation state
        let (list_id, child_id, old_position, value) = {
            let doc = self.doc.borrow();
            let list_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let child_key = match list::get_child_key(&doc, self.key, from_index) {
                Some(ck) => ck,
                None => return JsValue::UNDEFINED,
            };
            let child = match doc.get_node(child_key) {
                Some(n) => n,
                None => return JsValue::UNDEFINED,
            };
            let child_id = child.id.clone();
            let old_position = child.parent_key.clone().unwrap_or_default();
            let value = list::get(&doc, self.key, from_index).unwrap_or(Json::Null);
            (list_id, child_id, old_position, value)
        };

        // Generate op_id
        let op_id = self.id_gen.borrow_mut().generate_op_id();

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            list::move_item(&mut doc, self.key, from_index, to_index);
        }

        // Read new position after move
        let new_position = {
            let doc = self.doc.borrow();
            let child_node_key = doc.get_key_by_id(&child_id).unwrap();
            doc.get_node(child_node_key)
                .and_then(|n| n.parent_key.clone())
                .unwrap_or_default()
        };

        // Forward op
        let mut fwd_op = set_parent_key_op(&child_id, &new_position);
        fwd_op.op_id = Some(op_id);

        // Reverse op: SET_PARENT_KEY back to old position
        let reverse_ops = vec![set_parent_key_op(&child_id, &old_position)];

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveListUpdate {
                node_id: list_id,
                updates: vec![ListUpdateEntry::Move {
                    previous_index: from_index,
                    new_index: to_index,
                    value,
                }],
            },
        })
    }

    /// Delete the item at the given index.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn delete(&self, index: usize) -> JsValue {
        // CRITICAL: Capture state BEFORE mutation (node will be removed from arena)
        let (list_id, child_id, old_value, reverse_ops) = {
            let doc = self.doc.borrow();
            let list_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let child_key = match list::get_child_key(&doc, self.key, index) {
                Some(ck) => ck,
                None => return JsValue::UNDEFINED,
            };
            let child_id = doc
                .get_node(child_key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = list::get(&doc, self.key, index).unwrap_or(Json::Null);
            // Generate reverse: full CREATE chain to recreate the deleted subtree
            let reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);
            (list_id, child_id, old_value, reverse_ops)
        };

        // Generate op_id
        let op_id = self.id_gen.borrow_mut().generate_op_id();

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            list::delete(&mut doc, self.key, index);
        }

        // Forward op
        let mut fwd_op = delete_crdt_op(&child_id);
        fwd_op.op_id = Some(op_id);

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveListUpdate {
                node_id: list_id,
                updates: vec![ListUpdateEntry::Delete {
                    index,
                    old_value,
                }],
            },
        })
    }

    /// Replace the value at the given index.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    ///
    /// Uses the `HACK_addIntentAndDeletedIdToOperation` pattern: the forward op
    /// gets `intent: "set"` + `deleted_id`, and so does the first reverse op.
    pub fn set(&self, index: usize, value: JsValue) -> JsValue {
        let value = js_to_json(value);

        // CRITICAL: Capture pre-mutation state BEFORE modifying the tree
        let (list_id, old_child_id, position, old_value, mut reverse_ops) = {
            let doc = self.doc.borrow();
            let list_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();

            let (pos, child_key) = match doc.get_node(self.key) {
                Some(node) => match &node.data {
                    CrdtData::List { children, .. } if index < children.len() => {
                        (children[index].0.clone(), children[index].1)
                    }
                    _ => return JsValue::UNDEFINED,
                },
                None => return JsValue::UNDEFINED,
            };

            let old_child_id = doc
                .get_node(child_key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = list::get(&doc, self.key, index);
            // Generate reverse: full CREATE chain of old item
            let reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);
            (list_id, old_child_id, pos, old_value, reverse_ops)
        };

        // Generate IDs
        let (new_reg_id, op_id) = {
            let mut id_gen = self.id_gen.borrow_mut();
            (id_gen.generate_id(), id_gen.generate_op_id())
        };

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            list::set_with_id(&mut doc, self.key, index, value.clone(), &new_reg_id);
        }

        // Forward op with intent hack
        let mut fwd_op = create_register_op(&new_reg_id, &list_id, &position, value.clone());
        fwd_op.op_id = Some(op_id);
        fwd_op.intent = Some("set".to_string());
        fwd_op.deleted_id = Some(old_child_id.clone());

        // Reverse ops with intent hack: first op gets intent + deleted_id
        if let Some(first) = reverse_ops.first_mut() {
            first.intent = Some("set".to_string());
            first.deleted_id = Some(new_reg_id.clone());
        }

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveListUpdate {
                node_id: list_id,
                updates: vec![ListUpdateEntry::Set {
                    index,
                    old_value,
                    new_value: value,
                }],
            },
        })
    }

    /// Clear all items from the list.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn clear(&self) -> JsValue {
        // CRITICAL: Capture ALL children's state before mutation
        let (list_id, children_info, all_reverse_ops) = {
            let doc = self.doc.borrow();
            let list_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();

            let children: Vec<(usize, NodeKey, String, Json)> = match doc.get_node(self.key) {
                Some(node) => match &node.data {
                    CrdtData::List { children, .. } => children
                        .iter()
                        .enumerate()
                        .map(|(i, (_pos, ck))| {
                            let child_id = doc
                                .get_node(*ck)
                                .map(|n| n.id.clone())
                                .unwrap_or_default();
                            let value = match doc.get_node(*ck) {
                                Some(n) => match &n.data {
                                    CrdtData::Register { data } => data.clone(),
                                    _ => Json::Null,
                                },
                                None => Json::Null,
                            };
                            (i, *ck, child_id, value)
                        })
                        .collect(),
                    _ => return JsValue::UNDEFINED,
                },
                None => return JsValue::UNDEFINED,
            };

            if children.is_empty() {
                return JsValue::UNDEFINED;
            }

            // Generate reverse ops (CREATE chains) for ALL children before mutation
            let mut all_reverse = Vec::new();
            for &(_, ck, _, _) in &children {
                all_reverse.extend(apply::generate_create_ops_for_subtree(&doc, ck));
            }

            (list_id, children, all_reverse)
        };

        // Generate op IDs for each DELETE_CRDT
        let op_ids: Vec<String> = {
            let mut id_gen = self.id_gen.borrow_mut();
            children_info
                .iter()
                .map(|_| id_gen.generate_op_id())
                .collect()
        };

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            list::clear(&mut doc, self.key);
        }

        // Forward ops: DELETE_CRDT for each child
        let fwd_ops: Vec<Op> = children_info
            .iter()
            .zip(op_ids.iter())
            .map(|((_, _, child_id, _), op_id)| {
                let mut op = delete_crdt_op(child_id);
                op.op_id = Some(op_id.clone());
                op
            })
            .collect();

        // Update entries: report each deletion at its original index
        let update_entries: Vec<ListUpdateEntry> = children_info
            .iter()
            .rev()
            .map(|(i, _, _, value)| ListUpdateEntry::Delete {
                index: *i,
                old_value: value.clone(),
            })
            .collect();

        mutation_result_to_js(&MutationResult {
            ops: fwd_ops,
            reverse_ops: all_reverse_ops,
            update: StorageUpdate::LiveListUpdate {
                node_id: list_id,
                updates: update_entries,
            },
        })
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
            id_gen: self.id_gen.clone(),
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
    id_gen: SharedIdGen,
}

#[allow(dead_code)]
impl LiveMapHandle {
    pub(crate) fn new(doc: SharedDoc, key: NodeKey, id_gen: SharedIdGen) -> Self {
        Self { doc, key, id_gen }
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
    /// Returns a MutationResult with forward/reverse ops and storage update.
    pub fn set(&self, key: &str, value: JsValue) -> JsValue {
        let value = js_to_json(value);

        // Capture pre-mutation state
        let (map_id, old_value, old_reverse_ops) = {
            let doc = self.doc.borrow();
            let map_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = map::get(&doc, self.key, key);
            let old_child_key = map::get_child(&doc, self.key, key);
            // Generate reverse CREATE chain for old child (handles nested CRDTs)
            let old_reverse_ops = match old_child_key {
                Some(ck) => apply::generate_create_ops_for_subtree(&doc, ck),
                None => vec![],
            };
            (map_id, old_value, old_reverse_ops)
        };

        // Generate IDs
        let (reg_id, op_id) = {
            let mut id_gen = self.id_gen.borrow_mut();
            (id_gen.generate_id(), id_gen.generate_op_id())
        };

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            map::set_with_id(&mut doc, self.key, key, value.clone(), &reg_id);
        }

        // Forward op: CREATE_REGISTER for the new value
        let mut fwd_op = create_register_op(&reg_id, &map_id, key, value.clone());
        fwd_op.op_id = Some(op_id);

        // Reverse ops: recreate old child, or DELETE_CRDT if no old value
        let reverse_ops = if !old_reverse_ops.is_empty() {
            old_reverse_ops
        } else {
            // No old value: reverse is DELETE_CRDT of the new register
            vec![delete_crdt_op(&reg_id)]
        };

        let mut update_map = HashMap::new();
        update_map.insert(
            key.to_string(),
            UpdateDelta::Set {
                old_value,
                new_value: value,
            },
        );

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveMapUpdate {
                node_id: map_id,
                updates: update_map,
            },
        })
    }

    /// Delete a key from the map.
    /// Returns a MutationResult with forward/reverse ops and storage update,
    /// or `false` if the key didn't exist.
    pub fn delete(&self, key: &str) -> JsValue {
        // Capture pre-mutation state
        let (map_id, old_child_id, old_value, reverse_ops) = {
            let doc = self.doc.borrow();
            let map_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let child_key = match map::get_child(&doc, self.key, key) {
                Some(ck) => ck,
                None => return JsValue::FALSE,
            };
            let child_id = doc
                .get_node(child_key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = map::get(&doc, self.key, key).unwrap_or(Json::Null);
            // Generate reverse: full CREATE chain (handles nested CRDTs)
            let reverse_ops = apply::generate_create_ops_for_subtree(&doc, child_key);
            (map_id, child_id, old_value, reverse_ops)
        };

        // Generate op_id
        let op_id = self.id_gen.borrow_mut().generate_op_id();

        // Mutate tree
        {
            let mut doc = self.doc.borrow_mut();
            map::delete(&mut doc, self.key, key);
        }

        // Forward op
        let mut fwd_op = delete_crdt_op(&old_child_id);
        fwd_op.op_id = Some(op_id);

        let mut update_map = HashMap::new();
        update_map.insert(key.to_string(), UpdateDelta::Delete { old_value });

        mutation_result_to_js(&MutationResult {
            ops: vec![fwd_op],
            reverse_ops,
            update: StorageUpdate::LiveMapUpdate {
                node_id: map_id,
                updates: update_map,
            },
        })
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
            id_gen: self.id_gen.clone(),
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
    id_gen: SharedIdGen,
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
            id_gen: Rc::new(RefCell::new(IdGenerator::new(0))),
        }
    }

    /// Set the connection ID (called after WebSocket handshake).
    #[wasm_bindgen(js_name = "setConnectionId")]
    pub fn set_connection_id(&self, id: i32) {
        self.id_gen.borrow_mut().set_connection_id(id);
    }

    /// Get the current connection ID.
    #[wasm_bindgen(getter, js_name = "connectionId")]
    pub fn connection_id(&self) -> i32 {
        self.id_gen.borrow().connection_id()
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
        doc.root_key().map(|key| {
            LiveObjectHandle::new(self.doc.clone(), key, self.id_gen.clone())
        })
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
            id_gen: Rc::new(RefCell::new(IdGenerator::new(0))),
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

    /// Get a LiveListHandle by node ID. Returns `undefined` if not found or not a list.
    #[wasm_bindgen(js_name = "getListById")]
    pub fn get_list_by_id(&self, id: &str) -> Option<LiveListHandle> {
        let doc = self.doc.borrow();
        let key = doc.get_key_by_id(id)?;
        let node = doc.get_node(key)?;
        match &node.data {
            CrdtData::List { .. } => {
                Some(LiveListHandle::new(self.doc.clone(), key, self.id_gen.clone()))
            }
            _ => None,
        }
    }

    /// Get a LiveMapHandle by node ID. Returns `undefined` if not found or not a map.
    #[wasm_bindgen(js_name = "getMapById")]
    pub fn get_map_by_id(&self, id: &str) -> Option<LiveMapHandle> {
        let doc = self.doc.borrow();
        let key = doc.get_key_by_id(id)?;
        let node = doc.get_node(key)?;
        match &node.data {
            CrdtData::Map { .. } => {
                Some(LiveMapHandle::new(self.doc.clone(), key, self.id_gen.clone()))
            }
            _ => None,
        }
    }

    /// Get a LiveObjectHandle by node ID. Returns `undefined` if not found or not an object.
    #[wasm_bindgen(js_name = "getObjectById")]
    pub fn get_object_by_id(&self, id: &str) -> Option<LiveObjectHandle> {
        let doc = self.doc.borrow();
        let key = doc.get_key_by_id(id)?;
        let node = doc.get_node(key)?;
        match &node.data {
            CrdtData::Object { .. } => {
                Some(LiveObjectHandle::new(self.doc.clone(), key, self.id_gen.clone()))
            }
            _ => None,
        }
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
