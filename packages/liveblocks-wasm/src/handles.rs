use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::rc::Rc;

use wasm_bindgen::prelude::*;

use crate::arena::NodeKey;
use crate::crdt::node::CrdtData;
use crate::crdt::{list, map, object};
use crate::document::Document;
use crate::id_gen::IdGenerator;
use crate::lson::{create_lson_subtree, parse_lson, LsonValue};
use crate::ops::apply;
use crate::ops::serialize::{
    create_register_op, delete_crdt_op, delete_object_key_op, set_parent_key_op, update_object_op,
};
use crate::types::{ApplyResult, CrdtType, Json, MutationResult, Op, OpCode, OpSource, SerializedCrdt};
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
/// Uses `serialize_missing_as_null` so that `Json::Null` (which serde
/// serializes via `serialize_unit`) becomes `JsValue::NULL` rather than
/// `JsValue::UNDEFINED`.  This is critical for op data like
/// `UPDATE_OBJECT { data: { a: null } }` — without it the JS side
/// sees `{ data: {} }` because `undefined` properties are dropped.
fn to_js<T: serde::Serialize>(val: &T) -> Result<JsValue, serde_wasm_bindgen::Error> {
    let serializer = serde_wasm_bindgen::Serializer::new()
        .serialize_maps_as_objects(true)
        .serialize_missing_as_null(true);
    val.serialize(&serializer)
}

/// Serialize a MutationResult to JsValue.
fn mutation_result_to_js(result: &MutationResult) -> JsValue {
    to_js(result).unwrap_or(JsValue::UNDEFINED)
}

/// Return a serialized no-op MutationResult (empty ops, empty update).
/// Used when a mutation is a no-op (e.g. move from==to, clear on empty list,
/// or node not found). The JS side expects a valid MutationResult object
/// with `ops`, `reverseOps`, and `update` fields — returning JsValue::UNDEFINED
/// causes "Cannot read properties of undefined" crashes.
fn noop_mutation_result_js(node_id: &str, update_type: &str) -> JsValue {
    let update = match update_type {
        "list" => StorageUpdate::LiveListUpdate {
            node_id: node_id.to_string(),
            updates: vec![],
        },
        "map" => StorageUpdate::LiveMapUpdate {
            node_id: node_id.to_string(),
            updates: HashMap::new(),
        },
        _ => StorageUpdate::LiveObjectUpdate {
            node_id: node_id.to_string(),
            updates: HashMap::new(),
        },
    };
    mutation_result_to_js(&MutationResult {
        ops: vec![],
        reverse_ops: vec![],
        update,
    })
}

/// Build a JS entry object for a child node in the CRDT tree.
/// Returns `{ type: "scalar", value: <json> }` for Registers,
/// or `{ type: "node", nodeId: <string>, nodeType: <string> }` for CRDT children.
fn child_to_entry_js(doc: &Document, child_key: NodeKey) -> JsValue {
    let Some(child) = doc.get_node(child_key) else {
        return JsValue::UNDEFINED;
    };
    let obj = js_sys::Object::new();
    match &child.data {
        CrdtData::Register { data } => {
            let _ = js_sys::Reflect::set(&obj, &"type".into(), &"scalar".into());
            let _ = js_sys::Reflect::set(&obj, &"value".into(), &json_to_js(data));
        }
        _ => {
            let _ = js_sys::Reflect::set(&obj, &"type".into(), &"node".into());
            let _ = js_sys::Reflect::set(
                &obj,
                &"nodeId".into(),
                &JsValue::from_str(&child.id),
            );
            let node_type_str = match child.node_type {
                CrdtType::Object => "object",
                CrdtType::List => "list",
                CrdtType::Map => "map",
                CrdtType::Register => "register",
            };
            let _ = js_sys::Reflect::set(
                &obj,
                &"nodeType".into(),
                &JsValue::from_str(node_type_str),
            );
        }
    }
    obj.into()
}

/// Derive structural changes from a successfully applied op.
/// Structural changes tell JS which nodes to create/delete/move/invalidate.
fn derive_structural_changes(op: &Op, changes: &js_sys::Array) {
    match op.op_code {
        OpCode::CreateObject | OpCode::CreateList | OpCode::CreateMap => {
            // A new CRDT node was created — JS needs a wrapper
            let change = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&change, &"type".into(), &"created".into());
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeId".into(),
                &JsValue::from_str(&op.id),
            );
            let node_type = match op.op_code {
                OpCode::CreateObject => "object",
                OpCode::CreateList => "list",
                OpCode::CreateMap => "map",
                _ => unreachable!(),
            };
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeType".into(),
                &JsValue::from_str(node_type),
            );
            if let Some(pid) = &op.parent_id {
                let _ = js_sys::Reflect::set(
                    &change,
                    &"parentId".into(),
                    &JsValue::from_str(pid),
                );
            }
            if let Some(pkey) = &op.parent_key {
                let _ = js_sys::Reflect::set(
                    &change,
                    &"parentKey".into(),
                    &JsValue::from_str(pkey),
                );
            }
            changes.push(&change);

            // Parent also needs cache invalidation
            if let Some(pid) = &op.parent_id {
                let updated = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&updated, &"type".into(), &"updated".into());
                let _ = js_sys::Reflect::set(
                    &updated,
                    &"nodeId".into(),
                    &JsValue::from_str(pid),
                );
                changes.push(&updated);
            }
        }
        OpCode::CreateRegister => {
            // Emit "created" for the register so JS creates a LiveRegister wrapper
            let change = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&change, &"type".into(), &"created".into());
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeId".into(),
                &JsValue::from_str(&op.id),
            );
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeType".into(),
                &"register".into(),
            );
            if let Some(pid) = &op.parent_id {
                let _ = js_sys::Reflect::set(
                    &change,
                    &"parentId".into(),
                    &JsValue::from_str(pid),
                );
            }
            if let Some(pkey) = &op.parent_key {
                let _ = js_sys::Reflect::set(
                    &change,
                    &"parentKey".into(),
                    &JsValue::from_str(pkey),
                );
            }
            // Include register data so JS can create LiveRegister with
            // the correct value (needed for post-detach iteration).
            if let Some(ref data) = op.data {
                if let Ok(v) = to_js(data) {
                    let _ = js_sys::Reflect::set(
                        &change,
                        &"data".into(),
                        &v,
                    );
                }
            }
            changes.push(&change);

            // Parent also needs cache invalidation
            if let Some(pid) = &op.parent_id {
                let updated = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&updated, &"type".into(), &"updated".into());
                let _ = js_sys::Reflect::set(
                    &updated,
                    &"nodeId".into(),
                    &JsValue::from_str(pid),
                );
                changes.push(&updated);
            }
        }
        OpCode::DeleteCrdt => {
            let change = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&change, &"type".into(), &"deleted".into());
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeId".into(),
                &JsValue::from_str(&op.id),
            );
            changes.push(&change);
        }
        OpCode::SetParentKey => {
            let change = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&change, &"type".into(), &"moved".into());
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeId".into(),
                &JsValue::from_str(&op.id),
            );
            if let Some(pkey) = &op.parent_key {
                let _ = js_sys::Reflect::set(
                    &change,
                    &"newParentKey".into(),
                    &JsValue::from_str(pkey),
                );
            }
            changes.push(&change);
        }
        OpCode::UpdateObject | OpCode::DeleteObjectKey => {
            let change = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&change, &"type".into(), &"updated".into());
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeId".into(),
                &JsValue::from_str(&op.id),
            );
            changes.push(&change);
        }
        OpCode::Init => {
            let change = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&change, &"type".into(), &"updated".into());
            let _ = js_sys::Reflect::set(
                &change,
                &"nodeId".into(),
                &JsValue::from_str(&op.id),
            );
            changes.push(&change);
        }
    }
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

    /// Set a plain scalar value on a property (UPDATE_OBJECT path).
    fn set_scalar(&self, key: &str, value: Json) -> JsValue {
        // Capture pre-mutation state
        let (node_id, old_value, old_crdt_reverse) = {
            let doc = self.doc.borrow();
            let node_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = object::get_plain(&doc, self.key, key).cloned();
            // Check if the old value is a real CRDT child (not a Register)
            let old_crdt_reverse = object::get_child(&doc, self.key, key)
                .and_then(|ck| {
                    let node = doc.get_node(ck)?;
                    if matches!(&node.data, CrdtData::Register { .. }) {
                        None
                    } else {
                        Some(apply::generate_create_ops_for_subtree(&doc, ck))
                    }
                });
            (node_id, old_value, old_crdt_reverse)
        };

        // Generate op_id
        let op_id = self.id_gen.borrow_mut().generate_op_id();

        // Mutate tree and track unacked op for ACK handling
        {
            let mut doc = self.doc.borrow_mut();
            object::set_plain(&mut doc, self.key, key, value.clone());
            object::set_unacked_op(&mut doc, self.key, key, op_id.clone());
        }

        // Forward op
        let mut fwd_data = BTreeMap::new();
        fwd_data.insert(key.to_string(), value.clone());
        let mut fwd_op = update_object_op(&node_id, fwd_data);
        fwd_op.op_id = Some(op_id);

        // Reverse ops
        let reverse_ops = if let Some(crdt_rev) = old_crdt_reverse {
            // Old value was a CRDT child — reverse recreates the subtree
            crdt_rev
        } else if let Some(old_val) = &old_value {
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

    /// Set a tagged LSON value on a property (CREATE_* ops path).
    fn set_tagged(&self, key: &str, value: Json) -> JsValue {
        // Capture pre-mutation state
        let (node_id, old_value, old_reverse_ops) = {
            let doc = self.doc.borrow();
            let node_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_value = object::get_plain(&doc, self.key, key).cloned();
            let old_child_key = object::get_child(&doc, self.key, key);

            // Distinguish real CRDT children from Register wrappers
            let is_real_crdt = old_child_key
                .and_then(|ck| doc.get_node(ck))
                .is_some_and(|n| !matches!(&n.data, CrdtData::Register { .. }));

            let old_reverse_ops = if is_real_crdt {
                apply::generate_create_ops_for_subtree(&doc, old_child_key.unwrap())
            } else if let Some(ref val) = old_value {
                let mut rev_data = BTreeMap::new();
                rev_data.insert(key.to_string(), val.clone());
                vec![update_object_op(&node_id, rev_data)]
            } else {
                vec![delete_object_key_op(&node_id, key)]
            };
            (node_id, old_value, old_reverse_ops)
        };

        // Create subtree
        let (child_key, create_ops) = {
            let mut doc = self.doc.borrow_mut();
            let mut id_gen = self.id_gen.borrow_mut();
            create_lson_subtree(&mut doc, &mut id_gen, &node_id, key, &value)
        };

        // Attach child to parent object, removing old child if any
        {
            let mut doc = self.doc.borrow_mut();
            object::set_child(&mut doc, self.key, key, child_key);
        }

        // Update
        let mut updates = HashMap::new();
        updates.insert(
            key.to_string(),
            UpdateDelta::Set {
                old_value,
                new_value: Json::Null, // Placeholder for CRDT child
            },
        );

        mutation_result_to_js(&MutationResult {
            ops: create_ops,
            reverse_ops: old_reverse_ops,
            update: StorageUpdate::LiveObjectUpdate { node_id, updates },
        })
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
    /// Supports tagged LSON values (LiveObject, LiveList, LiveMap) in addition
    /// to plain scalars.
    pub fn set(&self, key: &str, value: JsValue) -> JsValue {
        let value = js_to_json(value);

        match parse_lson(&value) {
            LsonValue::Scalar(_) => self.set_scalar(key, value),
            _ => self.set_tagged(key, value),
        }
    }

    /// Update multiple properties at once from a JS object.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    /// Supports a mix of plain scalar and tagged LSON values.
    pub fn update(&self, updates: JsValue) -> JsValue {
        let map = match serde_wasm_bindgen::from_value::<BTreeMap<String, Json>>(updates) {
            Ok(m) => m,
            Err(_) => return JsValue::UNDEFINED,
        };

        if map.is_empty() {
            return JsValue::UNDEFINED;
        }

        // Separate scalars from tagged CRDT values
        let mut scalar_data = BTreeMap::new();
        let mut tagged_entries: Vec<(String, Json)> = Vec::new();
        for (k, v) in &map {
            match parse_lson(v) {
                LsonValue::Scalar(_) => {
                    scalar_data.insert(k.clone(), v.clone());
                }
                _ => {
                    tagged_entries.push((k.clone(), v.clone()));
                }
            }
        }

        // Capture pre-mutation state
        let (node_id, old_values, old_crdt_reverse_for_scalars, old_child_reverse) = {
            let doc = self.doc.borrow();
            let node_id = doc
                .get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default();
            let old_values: BTreeMap<String, Option<Json>> = scalar_data
                .keys()
                .map(|k| (k.clone(), object::get_plain(&doc, self.key, k).cloned()))
                .collect();
            // For scalars that replace a CRDT child, capture reverse CREATE ops
            // BEFORE the mutation removes them.
            let old_crdt_reverse_for_scalars: BTreeMap<String, Vec<Op>> = scalar_data
                .keys()
                .filter_map(|k| {
                    let ck = object::get_child(&doc, self.key, k)?;
                    let node = doc.get_node(ck)?;
                    if matches!(&node.data, CrdtData::Register { .. }) {
                        None // Register = scalar wrapper, handled by old_values
                    } else {
                        Some((k.clone(), apply::generate_create_ops_for_subtree(&doc, ck)))
                    }
                })
                .collect();
            // For tagged entries, capture old child reverse ops.
            // get_child() returns ANY child including Register wrappers for
            // scalars.  When the old child is a Register we must generate an
            // UPDATE_OBJECT reverse (restoring the scalar), NOT CREATE_REGISTER.
            let old_child_reverse: Vec<(String, Vec<Op>, Option<Json>)> = tagged_entries
                .iter()
                .map(|(k, _)| {
                    let old_plain = object::get_plain(&doc, self.key, k).cloned();
                    let old_child_key = object::get_child(&doc, self.key, k);

                    // Determine if the old child is a real CRDT (Object/List/Map)
                    // vs a scalar wrapped in a Register (or absent).
                    let is_real_crdt = old_child_key
                        .and_then(|ck| doc.get_node(ck))
                        .is_some_and(|n| !matches!(&n.data, CrdtData::Register { .. }));

                    let rev_ops = if is_real_crdt {
                        // Old value was a CRDT child — reverse recreates the subtree
                        apply::generate_create_ops_for_subtree(&doc, old_child_key.unwrap())
                    } else if let Some(ref val) = old_plain {
                        // Old value was a scalar — reverse sets it back
                        let mut rev_data = BTreeMap::new();
                        rev_data.insert(k.clone(), val.clone());
                        vec![update_object_op(&node_id, rev_data)]
                    } else {
                        // No old value — reverse deletes the key
                        vec![delete_object_key_op(&node_id, k)]
                    };
                    (k.clone(), rev_ops, old_plain)
                })
                .collect();
            (node_id, old_values, old_crdt_reverse_for_scalars, old_child_reverse)
        };

        let mut all_ops = Vec::new();
        let mut all_reverse = Vec::new();
        let mut update_deltas = HashMap::new();

        // Handle scalar keys via UPDATE_OBJECT
        if !scalar_data.is_empty() {
            let op_id = self.id_gen.borrow_mut().generate_op_id();

            // Mutate tree for scalars and track unacked ops for ACK handling
            {
                let mut doc = self.doc.borrow_mut();
                for (k, v) in &scalar_data {
                    object::set_plain(&mut doc, self.key, k, v.clone());
                    object::set_unacked_op(&mut doc, self.key, k, op_id.clone());
                }
            }

            let mut fwd_op = update_object_op(&node_id, scalar_data.clone());
            fwd_op.op_id = Some(op_id);
            all_ops.push(fwd_op);

            // Reverse ops for scalars
            let mut rev_update_data = BTreeMap::new();
            let mut rev_delete_ops = Vec::new();
            for (k, old_val) in &old_values {
                if let Some(crdt_rev) = old_crdt_reverse_for_scalars.get(k) {
                    // Old value was a CRDT child — reverse recreates the subtree
                    all_reverse.extend(crdt_rev.clone());
                } else if let Some(val) = old_val {
                    rev_update_data.insert(k.clone(), val.clone());
                } else {
                    rev_delete_ops.push(delete_object_key_op(&node_id, k));
                }
            }
            if !rev_update_data.is_empty() {
                all_reverse.push(update_object_op(&node_id, rev_update_data));
            }
            all_reverse.extend(rev_delete_ops);

            for (k, v) in &scalar_data {
                let old_value = old_values.get(k).and_then(|o| o.clone());
                update_deltas.insert(
                    k.clone(),
                    UpdateDelta::Set {
                        old_value,
                        new_value: v.clone(),
                    },
                );
            }
        }

        // Handle tagged CRDT entries
        for (i, (k, v)) in tagged_entries.iter().enumerate() {
            let (child_key, create_ops) = {
                let mut doc = self.doc.borrow_mut();
                let mut id_gen = self.id_gen.borrow_mut();
                create_lson_subtree(&mut doc, &mut id_gen, &node_id, k, v)
            };

            {
                let mut doc = self.doc.borrow_mut();
                object::set_child(&mut doc, self.key, k, child_key);
            }

            all_ops.extend(create_ops);

            let (_, ref rev_ops, ref old_plain) = old_child_reverse[i];
            all_reverse.extend(rev_ops.clone());

            update_deltas.insert(
                k.clone(),
                UpdateDelta::Set {
                    old_value: old_plain.clone(),
                    new_value: Json::Null, // Placeholder for CRDT child
                },
            );
        }

        mutation_result_to_js(&MutationResult {
            ops: all_ops,
            reverse_ops: all_reverse,
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
                    deleted_id: None,
                }
            } else {
                UpdateDelta::Delete {
                    old_value: Json::Null,
                    deleted_id: None,
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
    /// Supports tagged LSON values.
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

        match parse_lson(&value) {
            LsonValue::Scalar(_) => {
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
                let mut fwd_op =
                    create_register_op(&reg_id, &list_id, &info.position, value.clone());
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
            _ => {
                // Compute position for push (after last item)
                let position = {
                    let doc = self.doc.borrow();
                    let last_pos = match doc.get_node(self.key) {
                        Some(node) => match &node.data {
                            CrdtData::List { children, .. } => {
                                children.last().map(|(pos, _)| pos.clone())
                            }
                            _ => None,
                        },
                        None => None,
                    };
                    crate::position::make_position(last_pos.as_deref(), None)
                };

                // Create subtree
                let (child_key, create_ops) = {
                    let mut doc = self.doc.borrow_mut();
                    let mut id_gen = self.id_gen.borrow_mut();
                    create_lson_subtree(&mut doc, &mut id_gen, &list_id, &position, &value)
                };

                // Attach child to list
                {
                    let mut doc = self.doc.borrow_mut();
                    if let Some(node) = doc.get_node_mut(self.key)
                        && let CrdtData::List { children, .. } = &mut node.data
                    {
                        children.push((position, child_key));
                    }
                }

                // Reverse: DELETE_CRDT of the root of the subtree
                let child_id = {
                    let doc = self.doc.borrow();
                    doc.get_node(child_key)
                        .map(|n| n.id.clone())
                        .unwrap_or_default()
                };
                let reverse_ops = vec![delete_crdt_op(&child_id)];

                mutation_result_to_js(&MutationResult {
                    ops: create_ops,
                    reverse_ops,
                    update: StorageUpdate::LiveListUpdate {
                        node_id: list_id,
                        updates: vec![ListUpdateEntry::Insert {
                            index: old_length,
                            value: Json::Null,
                        }],
                    },
                })
            }
        }
    }

    /// Insert a value at the given index.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    /// Supports tagged LSON values.
    pub fn insert(&self, value: JsValue, index: usize) -> JsValue {
        let value = js_to_json(value);

        let list_id = {
            let doc = self.doc.borrow();
            doc.get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default()
        };

        match parse_lson(&value) {
            LsonValue::Scalar(_) => {
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
                let mut fwd_op =
                    create_register_op(&reg_id, &list_id, &info.position, value.clone());
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
            _ => {
                // Compute position for insert at index
                let position = {
                    let doc = self.doc.borrow();
                    let (before_pos, after_pos) = match doc.get_node(self.key) {
                        Some(node) => match &node.data {
                            CrdtData::List { children, .. } => {
                                let before = if index > 0 {
                                    children.get(index - 1).map(|(pos, _)| pos.clone())
                                } else {
                                    None
                                };
                                let after = children.get(index).map(|(pos, _)| pos.clone());
                                (before, after)
                            }
                            _ => (None, None),
                        },
                        None => (None, None),
                    };
                    crate::position::make_position(before_pos.as_deref(), after_pos.as_deref())
                };

                // Create subtree
                let (child_key, create_ops) = {
                    let mut doc = self.doc.borrow_mut();
                    let mut id_gen = self.id_gen.borrow_mut();
                    create_lson_subtree(&mut doc, &mut id_gen, &list_id, &position, &value)
                };

                // Attach child to list at position
                {
                    let mut doc = self.doc.borrow_mut();
                    if let Some(node) = doc.get_node_mut(self.key)
                        && let CrdtData::List { children, .. } = &mut node.data
                    {
                        let clamped_index = index.min(children.len());
                        children.insert(clamped_index, (position, child_key));
                    }
                }

                // Reverse: DELETE_CRDT of the root
                let child_id = {
                    let doc = self.doc.borrow();
                    doc.get_node(child_key)
                        .map(|n| n.id.clone())
                        .unwrap_or_default()
                };
                let reverse_ops = vec![delete_crdt_op(&child_id)];

                mutation_result_to_js(&MutationResult {
                    ops: create_ops,
                    reverse_ops,
                    update: StorageUpdate::LiveListUpdate {
                        node_id: list_id,
                        updates: vec![ListUpdateEntry::Insert {
                            index,
                            value: Json::Null,
                        }],
                    },
                })
            }
        }
    }

    /// Move an item from one index to another.
    /// Returns a MutationResult with forward/reverse ops and storage update.
    #[wasm_bindgen(js_name = "move")]
    pub fn move_item(&self, from_index: usize, to_index: usize) -> JsValue {
        // Get list_id early for no-op returns
        let list_id = {
            let doc = self.doc.borrow();
            doc.get_node(self.key)
                .map(|n| n.id.clone())
                .unwrap_or_default()
        };

        if from_index == to_index {
            return noop_mutation_result_js(&list_id, "list");
        }

        // Capture pre-mutation state
        let (child_id, old_position, value) = {
            let doc = self.doc.borrow();
            let child_key = match list::get_child_key(&doc, self.key, from_index) {
                Some(ck) => ck,
                None => return noop_mutation_result_js(&list_id, "list"),
            };
            let child = match doc.get_node(child_key) {
                Some(n) => n,
                None => return noop_mutation_result_js(&list_id, "list"),
            };
            let child_id = child.id.clone();
            let old_position = child.parent_key.clone().unwrap_or_default();
            let value = list::get(&doc, self.key, from_index).unwrap_or(Json::Null);
            (child_id, old_position, value)
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
            let child_node_key = match doc.get_key_by_id(&child_id) {
                Some(k) => k,
                None => return noop_mutation_result_js(&list_id, "list"),
            };
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
                None => return noop_mutation_result_js(&list_id, "list"),
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
    /// Supports tagged LSON values.
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
                    _ => return noop_mutation_result_js(&list_id, "list"),
                },
                None => return noop_mutation_result_js(&list_id, "list"),
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

        match parse_lson(&value) {
            LsonValue::Scalar(_) => {
                // Generate IDs
                let (new_reg_id, op_id) = {
                    let mut id_gen = self.id_gen.borrow_mut();
                    (id_gen.generate_id(), id_gen.generate_op_id())
                };

                // Mutate tree
                {
                    let mut doc = self.doc.borrow_mut();
                    list::set_with_id(&mut doc, self.key, index, value.clone(), &new_reg_id);
                    // Track unacked create for ACK conflict resolution
                    doc.unacked_creates.insert(
                        (list_id.clone(), position.clone()),
                        op_id.clone(),
                    );
                }

                // Forward op with intent hack
                let mut fwd_op =
                    create_register_op(&new_reg_id, &list_id, &position, value.clone());
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
            _ => {
                // Remove old child from list and document
                {
                    let mut doc = self.doc.borrow_mut();
                    // Remove old child node from arena
                    let old_child_key = match doc.get_node(self.key) {
                        Some(node) => match &node.data {
                            CrdtData::List { children, .. } if index < children.len() => {
                                Some(children[index].1)
                            }
                            _ => None,
                        },
                        None => None,
                    };
                    if let Some(ock) = old_child_key {
                        doc.remove_node_recursive(ock);
                    }
                }

                // Create subtree at the same position
                let (child_key, mut create_ops) = {
                    let mut doc = self.doc.borrow_mut();
                    let mut id_gen = self.id_gen.borrow_mut();
                    create_lson_subtree(&mut doc, &mut id_gen, &list_id, &position, &value)
                };

                // Replace in list children and track unacked create
                {
                    let mut doc = self.doc.borrow_mut();
                    if let Some(node) = doc.get_node_mut(self.key)
                        && let CrdtData::List { children, .. } = &mut node.data
                        && index < children.len()
                    {
                        children[index] = (position.clone(), child_key);
                    }
                    // Track unacked create for ACK conflict resolution
                    if let Some(first_op) = create_ops.first() {
                        if let Some(op_id) = &first_op.op_id {
                            doc.unacked_creates.insert(
                                (list_id.clone(), position.clone()),
                                op_id.clone(),
                            );
                        }
                    }
                }

                // Intent hack on first CREATE op
                let new_child_id = {
                    let doc = self.doc.borrow();
                    doc.get_node(child_key)
                        .map(|n| n.id.clone())
                        .unwrap_or_default()
                };
                if let Some(first) = create_ops.first_mut() {
                    first.intent = Some("set".to_string());
                    first.deleted_id = Some(old_child_id.clone());
                }

                // Reverse ops with intent hack
                if let Some(first) = reverse_ops.first_mut() {
                    first.intent = Some("set".to_string());
                    first.deleted_id = Some(new_child_id);
                }

                mutation_result_to_js(&MutationResult {
                    ops: create_ops,
                    reverse_ops,
                    update: StorageUpdate::LiveListUpdate {
                        node_id: list_id,
                        updates: vec![ListUpdateEntry::Set {
                            index,
                            old_value,
                            new_value: Json::Null,
                        }],
                    },
                })
            }
        }
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
                    _ => return noop_mutation_result_js(&list_id, "list"),
                },
                None => return noop_mutation_result_js(&list_id, "list"),
            };

            if children.is_empty() {
                return mutation_result_to_js(&MutationResult {
                    ops: vec![],
                    reverse_ops: vec![],
                    update: StorageUpdate::LiveListUpdate {
                        node_id: list_id,
                        updates: vec![],
                    },
                });
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

        // Update entries: report each deletion at index 0, matching the JS
        // convention where items shift left after each sequential deletion.
        let update_entries: Vec<ListUpdateEntry> = children_info
            .iter()
            .map(|(_, _, _, value)| ListUpdateEntry::Delete {
                index: 0,
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
    /// Supports tagged LSON values.
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

        match parse_lson(&value) {
            LsonValue::Scalar(_) => {
                // Generate IDs
                let (reg_id, op_id) = {
                    let mut id_gen = self.id_gen.borrow_mut();
                    (id_gen.generate_id(), id_gen.generate_op_id())
                };

                // Mutate tree
                {
                    let mut doc = self.doc.borrow_mut();
                    map::set_with_id(&mut doc, self.key, key, value.clone(), &reg_id);
                    // Track unacked create for ACK conflict resolution
                    doc.unacked_creates.insert(
                        (map_id.clone(), key.to_string()),
                        op_id.clone(),
                    );
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
            _ => {
                // Remove old child at this key
                {
                    let mut doc = self.doc.borrow_mut();
                    // Remove old child from map and document
                    let old_child_key = match doc.get_node(self.key) {
                        Some(node) => match &node.data {
                            CrdtData::Map { children, .. } => children.get(key).copied(),
                            _ => None,
                        },
                        None => None,
                    };
                    if let Some(ock) = old_child_key {
                        if let Some(node) = doc.get_node_mut(self.key)
                            && let CrdtData::Map { children, .. } = &mut node.data
                        {
                            children.remove(key);
                        }
                        doc.remove_node(ock);
                    }
                }

                // Create subtree
                let (child_key, create_ops) = {
                    let mut doc = self.doc.borrow_mut();
                    let mut id_gen = self.id_gen.borrow_mut();
                    create_lson_subtree(&mut doc, &mut id_gen, &map_id, key, &value)
                };

                // Attach child to map and track unacked create
                {
                    let mut doc = self.doc.borrow_mut();
                    if let Some(node) = doc.get_node_mut(self.key)
                        && let CrdtData::Map { children, .. } = &mut node.data
                    {
                        children.insert(key.to_string(), child_key);
                    }
                    // Track unacked create for ACK conflict resolution
                    if let Some(first_op) = create_ops.first() {
                        if let Some(op_id) = &first_op.op_id {
                            doc.unacked_creates.insert(
                                (map_id.clone(), key.to_string()),
                                op_id.clone(),
                            );
                        }
                    }
                }

                // Reverse ops
                let child_id = {
                    let doc = self.doc.borrow();
                    doc.get_node(child_key)
                        .map(|n| n.id.clone())
                        .unwrap_or_default()
                };
                let reverse_ops = if !old_reverse_ops.is_empty() {
                    old_reverse_ops
                } else {
                    vec![delete_crdt_op(&child_id)]
                };

                let mut update_map = HashMap::new();
                update_map.insert(
                    key.to_string(),
                    UpdateDelta::Set {
                        old_value,
                        new_value: Json::Null, // Placeholder for CRDT child
                    },
                );

                mutation_result_to_js(&MutationResult {
                    ops: create_ops,
                    reverse_ops,
                    update: StorageUpdate::LiveMapUpdate {
                        node_id: map_id,
                        updates: update_map,
                    },
                })
            }
        }
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
        update_map.insert(key.to_string(), UpdateDelta::Delete { old_value, deleted_id: None });

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

    /// Generate a new node ID from the shared IdGenerator.
    #[wasm_bindgen(js_name = "generateId")]
    pub fn generate_id(&self) -> String {
        self.id_gen.borrow_mut().generate_id()
    }

    /// Generate a new operation ID from the shared IdGenerator.
    #[wasm_bindgen(js_name = "generateOpId")]
    pub fn generate_op_id(&self) -> String {
        self.id_gen.borrow_mut().generate_op_id()
    }

    /// Get the current node clock value.
    #[wasm_bindgen(getter, js_name = "nodeClock")]
    pub fn node_clock(&self) -> u32 {
        self.id_gen.borrow().node_clock()
    }

    /// Get the current op clock value.
    #[wasm_bindgen(getter, js_name = "opClock")]
    pub fn op_clock(&self) -> u32 {
        self.id_gen.borrow().op_clock()
    }

    /// Set the node clock value.
    #[wasm_bindgen(js_name = "setNodeClock")]
    pub fn set_node_clock(&self, value: u32) {
        self.id_gen.borrow_mut().set_node_clock(value);
    }

    /// Set the op clock value.
    #[wasm_bindgen(js_name = "setOpClock")]
    pub fn set_op_clock(&self, value: u32) {
        self.id_gen.borrow_mut().set_op_clock(value);
    }

    // ============================================================
    // Read delegation APIs (Phase 1)
    // ============================================================

    /// Get the node type as a string ("object", "list", "map", "register").
    #[wasm_bindgen(js_name = "getNodeType")]
    pub fn get_node_type(&self, id: &str) -> JsValue {
        let doc = self.doc.borrow();
        match doc.get_node_by_id(id) {
            Some(node) => {
                let t = match node.node_type {
                    CrdtType::Object => "object",
                    CrdtType::List => "list",
                    CrdtType::Map => "map",
                    CrdtType::Register => "register",
                };
                JsValue::from_str(t)
            }
            None => JsValue::UNDEFINED,
        }
    }

    /// Get parent info for a node: `{ parentId, parentKey }`.
    #[wasm_bindgen(js_name = "getParentInfo")]
    pub fn get_parent_info(&self, id: &str) -> JsValue {
        let doc = self.doc.borrow();
        match doc.get_node_by_id(id) {
            Some(node) => {
                let obj = js_sys::Object::new();
                if let Some(pid) = &node.parent_id {
                    let _ = js_sys::Reflect::set(
                        &obj,
                        &"parentId".into(),
                        &JsValue::from_str(pid),
                    );
                }
                if let Some(pkey) = &node.parent_key {
                    let _ = js_sys::Reflect::set(
                        &obj,
                        &"parentKey".into(),
                        &JsValue::from_str(pkey),
                    );
                }
                obj.into()
            }
            None => JsValue::UNDEFINED,
        }
    }

    // -- LiveList reads --

    /// Get the length of a LiveList by node ID.
    #[wasm_bindgen(js_name = "listLength")]
    pub fn list_length(&self, list_id: &str) -> usize {
        let doc = self.doc.borrow();
        doc.get_key_by_id(list_id)
            .map(|key| list::length(&doc, key))
            .unwrap_or(0)
    }

    /// Get a single entry from a LiveList by index.
    /// Returns `{ type: "scalar", value }` or `{ type: "node", nodeId, nodeType }`.
    #[wasm_bindgen(js_name = "listGetEntry")]
    pub fn list_get_entry(&self, list_id: &str, index: usize) -> JsValue {
        let doc = self.doc.borrow();
        let key = match doc.get_key_by_id(list_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let child_key = match list::get_child_key(&doc, key, index) {
            Some(ck) => ck,
            None => return JsValue::UNDEFINED,
        };
        child_to_entry_js(&doc, child_key)
    }

    /// Get all entries from a LiveList as a JS array of entry objects.
    #[wasm_bindgen(js_name = "listEntries")]
    pub fn list_entries(&self, list_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let key = match doc.get_key_by_id(list_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let node = match doc.get_node(key) {
            Some(n) => n,
            None => return JsValue::UNDEFINED,
        };
        match &node.data {
            CrdtData::List { children, .. } => {
                let arr = js_sys::Array::new();
                for (_pos, child_key) in children {
                    arr.push(&child_to_entry_js(&doc, *child_key));
                }
                arr.into()
            }
            _ => JsValue::UNDEFINED,
        }
    }

    /// Convert a LiveList to its immutable JSON representation.
    #[wasm_bindgen(js_name = "listToImmutable")]
    pub fn list_to_immutable(&self, list_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let key = match doc.get_key_by_id(list_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        match list::to_immutable(&doc, key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    // -- LiveObject reads --

    /// Get a single entry from a LiveObject by key.
    #[wasm_bindgen(js_name = "objectGetEntry")]
    pub fn object_get_entry(&self, obj_id: &str, key: &str) -> JsValue {
        let doc = self.doc.borrow();
        let node_key = match doc.get_key_by_id(obj_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let child_key = match object::get_child(&doc, node_key, key) {
            Some(ck) => ck,
            None => return JsValue::UNDEFINED,
        };
        child_to_entry_js(&doc, child_key)
    }

    /// Get all property names from a LiveObject.
    #[wasm_bindgen(js_name = "objectKeys")]
    pub fn object_keys(&self, obj_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let key = match doc.get_key_by_id(obj_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let keys = object::keys(&doc, key);
        let arr = js_sys::Array::new();
        for k in keys {
            arr.push(&JsValue::from_str(&k));
        }
        arr.into()
    }

    /// Get all entries from a LiveObject as a JS array of `[key, entry]` pairs.
    #[wasm_bindgen(js_name = "objectEntries")]
    pub fn object_entries(&self, obj_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let node_key = match doc.get_key_by_id(obj_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let node = match doc.get_node(node_key) {
            Some(n) => n,
            None => return JsValue::UNDEFINED,
        };
        match &node.data {
            CrdtData::Object { children, .. } => {
                let arr = js_sys::Array::new();
                for (prop, child_key) in children {
                    let pair = js_sys::Array::new();
                    pair.push(&JsValue::from_str(prop));
                    pair.push(&child_to_entry_js(&doc, *child_key));
                    arr.push(&pair);
                }
                arr.into()
            }
            _ => JsValue::UNDEFINED,
        }
    }

    /// Convert a LiveObject to its immutable JSON representation.
    #[wasm_bindgen(js_name = "objectToImmutable")]
    pub fn object_to_immutable(&self, obj_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let key = match doc.get_key_by_id(obj_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        match object::to_immutable(&doc, key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    // -- LiveMap reads --

    /// Get a single entry from a LiveMap by key.
    #[wasm_bindgen(js_name = "mapGetEntry")]
    pub fn map_get_entry(&self, map_id: &str, key: &str) -> JsValue {
        let doc = self.doc.borrow();
        let node_key = match doc.get_key_by_id(map_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let child_key = match map::get_child(&doc, node_key, key) {
            Some(ck) => ck,
            None => return JsValue::UNDEFINED,
        };
        child_to_entry_js(&doc, child_key)
    }

    /// Check if a key exists in a LiveMap.
    #[wasm_bindgen(js_name = "mapHas")]
    pub fn map_has(&self, map_id: &str, key: &str) -> bool {
        let doc = self.doc.borrow();
        doc.get_key_by_id(map_id)
            .map(|k| map::has(&doc, k, key))
            .unwrap_or(false)
    }

    /// Get the size of a LiveMap.
    #[wasm_bindgen(js_name = "mapSize")]
    pub fn map_size(&self, map_id: &str) -> usize {
        let doc = self.doc.borrow();
        doc.get_key_by_id(map_id)
            .map(|k| map::size(&doc, k))
            .unwrap_or(0)
    }

    /// Get all keys from a LiveMap.
    #[wasm_bindgen(js_name = "mapKeys")]
    pub fn map_keys(&self, map_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let key = match doc.get_key_by_id(map_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let keys = map::keys(&doc, key);
        let arr = js_sys::Array::new();
        for k in keys {
            arr.push(&JsValue::from_str(&k));
        }
        arr.into()
    }

    /// Get all entries from a LiveMap as a JS array of `[key, entry]` pairs.
    #[wasm_bindgen(js_name = "mapEntries")]
    pub fn map_entries_with_types(&self, map_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let node_key = match doc.get_key_by_id(map_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        let node = match doc.get_node(node_key) {
            Some(n) => n,
            None => return JsValue::UNDEFINED,
        };
        match &node.data {
            CrdtData::Map { children, .. } => {
                let arr = js_sys::Array::new();
                for (map_key, child_key) in children {
                    let pair = js_sys::Array::new();
                    pair.push(&JsValue::from_str(map_key));
                    pair.push(&child_to_entry_js(&doc, *child_key));
                    arr.push(&pair);
                }
                arr.into()
            }
            _ => JsValue::UNDEFINED,
        }
    }

    /// Convert a LiveMap to its immutable JSON representation.
    #[wasm_bindgen(js_name = "mapToImmutable")]
    pub fn map_to_immutable(&self, map_id: &str) -> JsValue {
        let doc = self.doc.borrow();
        let key = match doc.get_key_by_id(map_id) {
            Some(k) => k,
            None => return JsValue::UNDEFINED,
        };
        match map::to_immutable(&doc, key) {
            Some(json) => json_to_js(&json),
            None => JsValue::UNDEFINED,
        }
    }

    // ============================================================
    // Rust-owned applyOp with structural changes (Phase 2)
    // ============================================================

    /// Apply a single operation in Rust-owned mode.
    /// Returns structural changes alongside the standard result.
    ///
    /// Result: `{ modified, reverse?, update?, structuralChanges? }`
    #[wasm_bindgen(js_name = "applyOpOwned")]
    pub fn apply_op_owned(&self, op_js: JsValue, source: &str) -> JsValue {
        let op: Op = match serde_wasm_bindgen::from_value(op_js) {
            Ok(o) => o,
            Err(_) => {
                return JsValue::UNDEFINED;
            }
        };
        let src = parse_op_source(source);
        let mut doc = self.doc.borrow_mut();

        // Snapshot node IDs before apply to detect deletions
        let ids_before: std::collections::HashSet<String> =
            doc.all_node_ids().into_iter().collect();

        let result = apply::apply_op(&mut doc, &op, src);

        match &result {
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
                for op_item in reverse {
                    if let Ok(js) = to_js(op_item) {
                        rev_arr.push(&js);
                    }
                }
                let _ = js_sys::Reflect::set(&obj, &"reverse".into(), &rev_arr);

                // Serialize the update
                if let Ok(upd) = to_js(update) {
                    let _ = js_sys::Reflect::set(&obj, &"update".into(), &upd);
                }

                // Derive structural changes from the op
                let changes = js_sys::Array::new();
                derive_structural_changes(&op, &changes);

                // Detect nodes that were deleted during apply (implicit deletes).
                // We snapshot which removed IDs had a JS wrapper (non-register, or
                // register children of lists/maps). Register children of objects
                // are scalar values in JS's #map and don't have pool wrappers.
                let ids_after: std::collections::HashSet<String> =
                    doc.all_node_ids().into_iter().collect();
                for removed_id in ids_before.difference(&ids_after) {
                    // We don't have the removed node anymore, but we can check
                    // if the JS pool would have had a wrapper. For safety, emit
                    // the deletion — syncJsTreeFromRustResult will skip nodes
                    // not found in the pool.
                    let del = js_sys::Object::new();
                    let _ = js_sys::Reflect::set(&del, &"type".into(), &"deleted".into());
                    let _ = js_sys::Reflect::set(
                        &del,
                        &"nodeId".into(),
                        &JsValue::from_str(removed_id),
                    );
                    changes.push(&del);
                }

                // Detect nodes that were created during apply (inline data registers)
                for added_id in ids_after.difference(&ids_before) {
                    // Skip the main op's node ID — it's already handled by derive_structural_changes
                    if *added_id == op.id {
                        continue;
                    }
                    if let Some(nk) = doc.get_key_by_id(added_id) {
                        if let Some(node) = doc.get_node(nk) {
                            // Skip register children of objects — in JS, these are
                            // scalar values stored in LiveObject's #map, not separate
                            // LiveRegister wrappers.
                            if matches!(&node.data, CrdtData::Register { .. }) {
                                let parent_is_object = node.parent_id.as_ref()
                                    .and_then(|pid| doc.get_node_by_id(pid))
                                    .is_some_and(|p| matches!(&p.data, CrdtData::Object { .. }));
                                if parent_is_object {
                                    continue;
                                }
                            }
                            let node_type = match &node.data {
                                CrdtData::Object { .. } => "object",
                                CrdtData::List { .. } => "list",
                                CrdtData::Map { .. } => "map",
                                CrdtData::Register { .. } => "register",
                            };
                            let cr = js_sys::Object::new();
                            let _ = js_sys::Reflect::set(&cr, &"type".into(), &"created".into());
                            let _ = js_sys::Reflect::set(
                                &cr,
                                &"nodeId".into(),
                                &JsValue::from_str(added_id),
                            );
                            let _ = js_sys::Reflect::set(
                                &cr,
                                &"nodeType".into(),
                                &JsValue::from_str(node_type),
                            );
                            if let Some(ref pid) = node.parent_id {
                                let _ = js_sys::Reflect::set(
                                    &cr,
                                    &"parentId".into(),
                                    &JsValue::from_str(pid),
                                );
                            }
                            if let Some(ref pkey) = node.parent_key {
                                let _ = js_sys::Reflect::set(
                                    &cr,
                                    &"parentKey".into(),
                                    &JsValue::from_str(pkey),
                                );
                            }
                            // Include register data so JS can create LiveRegister
                            // with the correct value (needed for post-detach iteration).
                            if let CrdtData::Register { data } = &node.data {
                                if let Ok(v) = to_js(data) {
                                    let _ = js_sys::Reflect::set(
                                        &cr,
                                        &"data".into(),
                                        &v,
                                    );
                                }
                            }
                            changes.push(&cr);
                        }
                    }
                }

                let _ = js_sys::Reflect::set(
                    &obj,
                    &"structuralChanges".into(),
                    &changes,
                );

                obj.into()
            }
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
