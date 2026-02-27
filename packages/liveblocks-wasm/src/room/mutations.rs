//! High-level storage mutation API for the Room.
//!
//! Provides ergonomic read/write methods that mirror the JS LiveObject,
//! LiveList, and LiveMap APIs. Write methods automatically handle:
//! - Document mutation
//! - Op generation and buffering for server sync
//! - Unacked op tracking for conflict resolution
//! - Undo/redo stack management
//! - Storage change event notification
//!
//! # Example (native)
//!
//! ```ignore
//! # use liveblocks_wasm::native_api::RoomBuilder;
//! # use liveblocks_wasm::types::Json;
//! # async fn example() {
//! let mut room = RoomBuilder::new("my-room")
//!     .public_key("pk_test_xxx")
//!     .build();
//!
//! // After connecting and loading storage...
//! let root = room.root_id().unwrap();
//! room.object_set(&root, "name", "Alice".into());
//! room.flush();
//! # }
//! ```

use std::collections::{BTreeMap, HashMap};

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
use crate::platform::{HttpClient, WebSocketConnector};
use crate::protocol::client_msg::ClientMsg;
use crate::room::Room;
use crate::room_engine::Stackframe;
use crate::types::{CrdtType, Json, MutationResult, Op};
use crate::updates::{ListUpdateEntry, StorageUpdate, UpdateDelta};

// ============================================================
// Internal helpers
// ============================================================

/// Resolve a node ID string to a NodeKey, or return None.
fn resolve(doc: &Document, node_id: &str) -> Option<NodeKey> {
    doc.get_key_by_id(node_id)
}

/// Apply a MutationResult to the room's outbound buffer, undo stack, and events.
fn dispatch_mutation<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    result: MutationResult,
) {
    let MutationResult {
        ops,
        reverse_ops,
        update,
    } = result;

    if !ops.is_empty() {
        // Buffer ops for sending to server
        room.buffer.push(ClientMsg::UpdateStorage { ops: ops.clone() });

        // Track as unacked for conflict resolution on ACK
        for op in &ops {
            if let Some(op_id) = &op.op_id {
                room.storage_engine
                    .track_unacked_op(op_id.clone(), op.clone());
            }
        }
    }

    // Push reverse ops to undo stack (or batch accumulator)
    let reverse_frames: Vec<Stackframe> = reverse_ops
        .into_iter()
        .map(Stackframe::StorageOp)
        .collect();
    room.storage_engine.dispatch_mutation(ops, reverse_frames);

    // Fire events
    room.events.notify_storage_change_with_updates(vec![update]);
    room.events
        .notify_history_change(room.storage_engine.can_undo(), room.storage_engine.can_redo());
}

// ============================================================
// Read methods
// ============================================================

impl<C: WebSocketConnector, H: HttpClient> Room<C, H> {
    /// Get the root node ID (typically `"root"`).
    pub fn root_id(&self) -> Option<String> {
        self.document
            .root_key()
            .and_then(|k| self.document.get_node(k))
            .map(|n| n.id.clone())
    }

    /// Get the CRDT type of a node by ID.
    pub fn get_node_type(&self, node_id: &str) -> Option<CrdtType> {
        self.document
            .get_node_by_id(node_id)
            .map(|n| n.node_type)
    }

    /// Get the node ID of a child CRDT node within a LiveObject.
    ///
    /// Returns `None` if the property doesn't exist or is a scalar value.
    /// Use this to navigate to nested LiveList/LiveMap/LiveObject nodes.
    pub fn object_get_child_id(&self, node_id: &str, key: &str) -> Option<String> {
        let nk = resolve(&self.document, node_id)?;
        let child_key = object::get_child(&self.document, nk, key)?;
        let child = self.document.get_node(child_key)?;
        // Only return IDs for non-Register nodes (registers are scalar wrappers)
        if matches!(&child.data, CrdtData::Register { .. }) {
            None
        } else {
            Some(child.id.clone())
        }
    }

    // -- LiveObject reads --

    /// Get a scalar property value from a LiveObject.
    pub fn object_get(&self, node_id: &str, key: &str) -> Option<Json> {
        let nk = resolve(&self.document, node_id)?;
        object::get_plain(&self.document, nk, key).cloned()
    }

    /// Get all property keys of a LiveObject.
    pub fn object_keys(&self, node_id: &str) -> Vec<String> {
        resolve(&self.document, node_id)
            .map(|nk| object::keys(&self.document, nk))
            .unwrap_or_default()
    }

    /// Convert a LiveObject to an immutable JSON representation (recursive).
    pub fn object_to_immutable(&self, node_id: &str) -> Option<Json> {
        let nk = resolve(&self.document, node_id)?;
        object::to_immutable(&self.document, nk)
    }

    // -- LiveList reads --

    /// Get the number of items in a LiveList.
    pub fn list_length(&self, node_id: &str) -> usize {
        resolve(&self.document, node_id)
            .map(|nk| list::length(&self.document, nk))
            .unwrap_or(0)
    }

    /// Get the value at an index in a LiveList.
    pub fn list_get(&self, node_id: &str, index: usize) -> Option<Json> {
        let nk = resolve(&self.document, node_id)?;
        list::get(&self.document, nk, index)
    }

    /// Convert a LiveList to an immutable JSON array (recursive).
    pub fn list_to_immutable(&self, node_id: &str) -> Option<Json> {
        let nk = resolve(&self.document, node_id)?;
        list::to_immutable(&self.document, nk)
    }

    /// Get all values from a LiveList as a Vec.
    pub fn list_to_array(&self, node_id: &str) -> Vec<Json> {
        resolve(&self.document, node_id)
            .map(|nk| list::to_array(&self.document, nk))
            .unwrap_or_default()
    }

    /// Get the node ID of a child CRDT at an index in a LiveList.
    ///
    /// Returns `None` if the item at the index is a scalar value.
    pub fn list_get_child_id(&self, node_id: &str, index: usize) -> Option<String> {
        let nk = resolve(&self.document, node_id)?;
        let child_key = list::get_child_key(&self.document, nk, index)?;
        let child = self.document.get_node(child_key)?;
        if matches!(&child.data, CrdtData::Register { .. }) {
            None
        } else {
            Some(child.id.clone())
        }
    }

    // -- LiveMap reads --

    /// Get a value by key from a LiveMap.
    pub fn map_get(&self, node_id: &str, key: &str) -> Option<Json> {
        let nk = resolve(&self.document, node_id)?;
        map::get(&self.document, nk, key)
    }

    /// Check if a key exists in a LiveMap.
    pub fn map_has(&self, node_id: &str, key: &str) -> bool {
        resolve(&self.document, node_id)
            .map(|nk| map::has(&self.document, nk, key))
            .unwrap_or(false)
    }

    /// Get the number of entries in a LiveMap.
    pub fn map_size(&self, node_id: &str) -> usize {
        resolve(&self.document, node_id)
            .map(|nk| map::size(&self.document, nk))
            .unwrap_or(0)
    }

    /// Get all keys from a LiveMap.
    pub fn map_keys(&self, node_id: &str) -> Vec<String> {
        resolve(&self.document, node_id)
            .map(|nk| map::keys(&self.document, nk))
            .unwrap_or_default()
    }

    /// Get all entries from a LiveMap as `(key, value)` pairs.
    pub fn map_entries(&self, node_id: &str) -> Vec<(String, Json)> {
        resolve(&self.document, node_id)
            .map(|nk| map::entries(&self.document, nk))
            .unwrap_or_default()
    }

    /// Convert a LiveMap to an immutable JSON representation (recursive).
    pub fn map_to_immutable(&self, node_id: &str) -> Option<Json> {
        let nk = resolve(&self.document, node_id)?;
        map::to_immutable(&self.document, nk)
    }

    /// Get the node ID of a child CRDT at a key in a LiveMap.
    ///
    /// Returns `None` if the value at the key is a scalar.
    pub fn map_get_child_id(&self, node_id: &str, key: &str) -> Option<String> {
        let nk = resolve(&self.document, node_id)?;
        let child_key = map::get_child(&self.document, nk, key)?;
        let child = self.document.get_node(child_key)?;
        if matches!(&child.data, CrdtData::Register { .. }) {
            None
        } else {
            Some(child.id.clone())
        }
    }
}

// ============================================================
// Write methods
// ============================================================

impl<C: WebSocketConnector, H: HttpClient> Room<C, H> {
    // -- LiveObject writes --

    /// Set a property on a LiveObject.
    ///
    /// Supports scalar JSON values. For nested CRDT types (LiveObject,
    /// LiveList, LiveMap), use tagged LSON format with `{ liveblocksType, data }`.
    pub fn object_set(&mut self, node_id: &str, key: &str, value: Json) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = match parse_lson(&value) {
            LsonValue::Scalar(_) => {
                object_set_scalar(&mut self.document, &mut self.id_gen, nk, key, value)
            }
            _ => object_set_tagged(&mut self.document, &mut self.id_gen, nk, key, value),
        };

        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Update multiple properties on a LiveObject at once.
    pub fn object_update(&mut self, node_id: &str, updates: BTreeMap<String, Json>) {
        if updates.is_empty() {
            return;
        }
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = object_update_impl(&mut self.document, &mut self.id_gen, nk, updates);
        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Delete a property from a LiveObject.
    pub fn object_delete(&mut self, node_id: &str, key: &str) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = object_delete_impl(&mut self.document, &mut self.id_gen, nk, key);
        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    // -- LiveList writes --

    /// Push a value to the end of a LiveList.
    pub fn list_push(&mut self, node_id: &str, value: Json) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = match parse_lson(&value) {
            LsonValue::Scalar(_) => {
                list_push_scalar(&mut self.document, &mut self.id_gen, nk, value)
            }
            _ => list_push_tagged(&mut self.document, &mut self.id_gen, nk, value),
        };

        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Insert a value at an index in a LiveList.
    pub fn list_insert(&mut self, node_id: &str, value: Json, index: usize) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = match parse_lson(&value) {
            LsonValue::Scalar(_) => {
                list_insert_scalar(&mut self.document, &mut self.id_gen, nk, index, value)
            }
            _ => list_insert_tagged(&mut self.document, &mut self.id_gen, nk, index, value),
        };

        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Move an item from one index to another in a LiveList.
    pub fn list_move(&mut self, node_id: &str, from_index: usize, to_index: usize) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = list_move_impl(&mut self.document, &mut self.id_gen, nk, from_index, to_index);
        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Delete the item at an index in a LiveList.
    pub fn list_delete(&mut self, node_id: &str, index: usize) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = list_delete_impl(&mut self.document, &mut self.id_gen, nk, index);
        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Replace the value at an index in a LiveList.
    ///
    /// Uses set-intent semantics for proper conflict resolution.
    pub fn list_set(&mut self, node_id: &str, index: usize, value: Json) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = match parse_lson(&value) {
            LsonValue::Scalar(_) => {
                list_set_scalar(&mut self.document, &mut self.id_gen, nk, index, value)
            }
            _ => list_set_tagged(&mut self.document, &mut self.id_gen, nk, index, value),
        };

        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Remove all items from a LiveList.
    pub fn list_clear(&mut self, node_id: &str) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = list_clear_impl(&mut self.document, &mut self.id_gen, nk);
        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    // -- LiveMap writes --

    /// Set a value at a key in a LiveMap.
    pub fn map_set(&mut self, node_id: &str, key: &str, value: Json) {
        let Some(nk) = resolve(&self.document, node_id) else {
            return;
        };

        let result = match parse_lson(&value) {
            LsonValue::Scalar(_) => {
                map_set_scalar(&mut self.document, &mut self.id_gen, nk, key, value)
            }
            _ => map_set_tagged(&mut self.document, &mut self.id_gen, nk, key, value),
        };

        if let Some(result) = result {
            dispatch_mutation(self, result);
        }
    }

    /// Delete a key from a LiveMap. Returns `true` if the key existed.
    pub fn map_delete(&mut self, node_id: &str, key: &str) -> bool {
        let Some(nk) = resolve(&self.document, node_id) else {
            return false;
        };

        match map_delete_impl(&mut self.document, &mut self.id_gen, nk, key) {
            Some(result) => {
                dispatch_mutation(self, result);
                true
            }
            None => false,
        }
    }
}

// ============================================================
// Pure mutation functions (no Room dependency)
// ============================================================
// These operate on Document + IdGenerator directly.
// Each returns Option<MutationResult> (None = no-op).

// -- Object mutations --

fn object_set_scalar(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    key: &str,
    value: Json,
) -> Option<MutationResult> {
    // Capture pre-mutation state
    let node_id = doc.get_node(nk)?.id.clone();
    let old_value = object::get_plain(doc, nk, key).cloned();
    let old_crdt_reverse = object::get_child(doc, nk, key).and_then(|ck| {
        let node = doc.get_node(ck)?;
        if matches!(&node.data, CrdtData::Register { .. }) {
            None
        } else {
            Some(apply::generate_create_ops_for_subtree(doc, ck))
        }
    });

    // Generate op_id
    let op_id = id_gen.generate_op_id();

    // Mutate tree
    object::set_plain(doc, nk, key, value.clone());
    object::set_unacked_op(doc, nk, key, op_id.clone());

    // Forward op
    let mut fwd_data = BTreeMap::new();
    fwd_data.insert(key.to_string(), value.clone());
    let mut fwd_op = update_object_op(&node_id, fwd_data);
    fwd_op.op_id = Some(op_id);

    // Reverse ops
    let reverse_ops = if let Some(crdt_rev) = old_crdt_reverse {
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

    Some(MutationResult {
        ops: vec![fwd_op],
        reverse_ops,
        update: StorageUpdate::LiveObjectUpdate { node_id, updates },
    })
}

fn object_set_tagged(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    key: &str,
    value: Json,
) -> Option<MutationResult> {
    let node_id = doc.get_node(nk)?.id.clone();
    let old_value = object::get_plain(doc, nk, key).cloned();

    // Check if old child is a real CRDT (not a Register wrapper)
    let old_child_key = object::get_child(doc, nk, key);
    let is_real_crdt = old_child_key
        .and_then(|ck| doc.get_node(ck))
        .is_some_and(|n| !matches!(&n.data, CrdtData::Register { .. }));

    let old_reverse_ops = if is_real_crdt {
        apply::generate_create_ops_for_subtree(doc, old_child_key.unwrap())
    } else if let Some(ref val) = old_value {
        let mut rev_data = BTreeMap::new();
        rev_data.insert(key.to_string(), val.clone());
        vec![update_object_op(&node_id, rev_data)]
    } else {
        vec![delete_object_key_op(&node_id, key)]
    };

    // Create subtree
    let (child_key, create_ops) = create_lson_subtree(doc, id_gen, &node_id, key, &value);

    // Attach child to parent
    object::set_child(doc, nk, key, child_key);

    let mut updates = HashMap::new();
    updates.insert(
        key.to_string(),
        UpdateDelta::Set {
            old_value,
            new_value: Json::Null,
        },
    );

    Some(MutationResult {
        ops: create_ops,
        reverse_ops: old_reverse_ops,
        update: StorageUpdate::LiveObjectUpdate { node_id, updates },
    })
}

fn object_update_impl(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    updates: BTreeMap<String, Json>,
) -> Option<MutationResult> {
    let node_id = doc.get_node(nk)?.id.clone();

    // Separate scalars from tagged CRDT values
    let mut scalar_data = BTreeMap::new();
    let mut tagged_entries: Vec<(String, Json)> = Vec::new();
    for (k, v) in &updates {
        match parse_lson(v) {
            LsonValue::Scalar(_) => {
                scalar_data.insert(k.clone(), v.clone());
            }
            _ => {
                tagged_entries.push((k.clone(), v.clone()));
            }
        }
    }

    let mut all_ops = Vec::new();
    let mut all_reverse = Vec::new();
    let mut update_deltas = HashMap::new();

    // Handle scalar keys via UPDATE_OBJECT
    if !scalar_data.is_empty() {
        // Capture old values and CRDT reverse ops
        let old_values: BTreeMap<String, Option<Json>> = scalar_data
            .keys()
            .map(|k| (k.clone(), object::get_plain(doc, nk, k).cloned()))
            .collect();
        let old_crdt_reverse: BTreeMap<String, Vec<Op>> = scalar_data
            .keys()
            .filter_map(|k| {
                let ck = object::get_child(doc, nk, k)?;
                let node = doc.get_node(ck)?;
                if matches!(&node.data, CrdtData::Register { .. }) {
                    None
                } else {
                    Some((k.clone(), apply::generate_create_ops_for_subtree(doc, ck)))
                }
            })
            .collect();

        let op_id = id_gen.generate_op_id();

        // Mutate tree
        for (k, v) in &scalar_data {
            object::set_plain(doc, nk, k, v.clone());
            object::set_unacked_op(doc, nk, k, op_id.clone());
        }

        let mut fwd_op = update_object_op(&node_id, scalar_data.clone());
        fwd_op.op_id = Some(op_id);
        all_ops.push(fwd_op);

        // Reverse ops
        let mut rev_update_data = BTreeMap::new();
        for (k, old_val) in &old_values {
            if let Some(crdt_rev) = old_crdt_reverse.get(k) {
                all_reverse.extend(crdt_rev.clone());
            } else if let Some(val) = old_val {
                rev_update_data.insert(k.clone(), val.clone());
            } else {
                all_reverse.push(delete_object_key_op(&node_id, k));
            }
        }
        if !rev_update_data.is_empty() {
            all_reverse.push(update_object_op(&node_id, rev_update_data));
        }

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
    for (k, v) in &tagged_entries {
        let old_plain = object::get_plain(doc, nk, k).cloned();
        let old_child_key = object::get_child(doc, nk, k);
        let is_real_crdt = old_child_key
            .and_then(|ck| doc.get_node(ck))
            .is_some_and(|n| !matches!(&n.data, CrdtData::Register { .. }));

        let rev_ops = if is_real_crdt {
            apply::generate_create_ops_for_subtree(doc, old_child_key.unwrap())
        } else if let Some(ref val) = old_plain {
            let mut rev_data = BTreeMap::new();
            rev_data.insert(k.clone(), val.clone());
            vec![update_object_op(&node_id, rev_data)]
        } else {
            vec![delete_object_key_op(&node_id, k)]
        };

        let (child_key, create_ops) = create_lson_subtree(doc, id_gen, &node_id, k, v);
        object::set_child(doc, nk, k, child_key);

        all_ops.extend(create_ops);
        all_reverse.extend(rev_ops);

        update_deltas.insert(
            k.clone(),
            UpdateDelta::Set {
                old_value: old_plain,
                new_value: Json::Null,
            },
        );
    }

    Some(MutationResult {
        ops: all_ops,
        reverse_ops: all_reverse,
        update: StorageUpdate::LiveObjectUpdate {
            node_id,
            updates: update_deltas,
        },
    })
}

fn object_delete_impl(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    key: &str,
) -> Option<MutationResult> {
    let node_id = doc.get_node(nk)?.id.clone();
    let old_value = object::get_plain(doc, nk, key).cloned();
    let has_child = object::get_child(doc, nk, key).is_some();

    if old_value.is_none() && !has_child {
        return None;
    }

    // Reverse ops BEFORE mutation
    let reverse_ops = if let Some(ref val) = old_value {
        let mut rev_data = BTreeMap::new();
        rev_data.insert(key.to_string(), val.clone());
        vec![update_object_op(&node_id, rev_data)]
    } else if let Some(child_key) = object::get_child(doc, nk, key) {
        apply::generate_create_ops_for_subtree(doc, child_key)
    } else {
        vec![]
    };

    let update_delta = UpdateDelta::Delete {
        old_value: old_value.unwrap_or(Json::Null),
        deleted_id: None,
    };

    // Generate op_id
    let op_id = id_gen.generate_op_id();

    // Mutate tree
    object::delete_key(doc, nk, key);

    let mut fwd_op = delete_object_key_op(&node_id, key);
    fwd_op.op_id = Some(op_id);

    let mut update_map = HashMap::new();
    update_map.insert(key.to_string(), update_delta);

    Some(MutationResult {
        ops: vec![fwd_op],
        reverse_ops,
        update: StorageUpdate::LiveObjectUpdate {
            node_id,
            updates: update_map,
        },
    })
}

// -- List mutations --

fn list_push_scalar(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    value: Json,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();
    let old_length = list::length(doc, nk);

    let reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    let info = list::push_with_id(doc, nk, value.clone(), &reg_id);

    let mut fwd_op = create_register_op(&reg_id, &list_id, &info.position, value.clone());
    fwd_op.op_id = Some(op_id);

    let reverse_ops = vec![delete_crdt_op(&reg_id)];

    Some(MutationResult {
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

fn list_push_tagged(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    value: Json,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();
    let old_length = list::length(doc, nk);

    // Compute position (after last item)
    let last_pos = match doc.get_node(nk)? {
        node => match &node.data {
            CrdtData::List { children, .. } => children.last().map(|(pos, _)| pos.clone()),
            _ => return None,
        },
    };
    let position = crate::position::make_position(last_pos.as_deref(), None);

    // Create subtree
    let (child_key, create_ops) = create_lson_subtree(doc, id_gen, &list_id, &position, &value);

    // Attach child to list
    if let Some(node) = doc.get_node_mut(nk)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        children.push((position, child_key));
    }

    let child_id = doc.get_node(child_key)?.id.clone();
    let reverse_ops = vec![delete_crdt_op(&child_id)];

    Some(MutationResult {
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

fn list_insert_scalar(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    index: usize,
    value: Json,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();

    let reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    let info = list::insert_with_id(doc, nk, index, value.clone(), &reg_id);

    let mut fwd_op = create_register_op(&reg_id, &list_id, &info.position, value.clone());
    fwd_op.op_id = Some(op_id);

    let reverse_ops = vec![delete_crdt_op(&reg_id)];

    Some(MutationResult {
        ops: vec![fwd_op],
        reverse_ops,
        update: StorageUpdate::LiveListUpdate {
            node_id: list_id,
            updates: vec![ListUpdateEntry::Insert { index, value }],
        },
    })
}

fn list_insert_tagged(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    index: usize,
    value: Json,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();

    // Compute position
    let (before_pos, after_pos) = match doc.get_node(nk)? {
        node => match &node.data {
            CrdtData::List { children, .. } => {
                let before = if index > 0 {
                    children.get(index - 1).map(|(pos, _)| pos.clone())
                } else {
                    None
                };
                let after = children.get(index).map(|(pos, _)| pos.clone());
                (before, after)
            }
            _ => return None,
        },
    };
    let position = crate::position::make_position(before_pos.as_deref(), after_pos.as_deref());

    let (child_key, create_ops) = create_lson_subtree(doc, id_gen, &list_id, &position, &value);

    // Attach child at index
    if let Some(node) = doc.get_node_mut(nk)
        && let CrdtData::List { children, .. } = &mut node.data
    {
        let clamped = index.min(children.len());
        children.insert(clamped, (position, child_key));
    }

    let child_id = doc.get_node(child_key)?.id.clone();
    let reverse_ops = vec![delete_crdt_op(&child_id)];

    Some(MutationResult {
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

fn list_move_impl(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    from_index: usize,
    to_index: usize,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();

    if from_index == to_index {
        return None;
    }

    // Capture pre-mutation state
    let child_key = list::get_child_key(doc, nk, from_index)?;
    let child = doc.get_node(child_key)?;
    let child_id = child.id.clone();
    let old_position = child.parent_key.clone().unwrap_or_default();
    let value = list::get(doc, nk, from_index).unwrap_or(Json::Null);

    let op_id = id_gen.generate_op_id();

    // Mutate tree
    list::move_item(doc, nk, from_index, to_index);

    // Read new position after move
    let child_node_key = doc.get_key_by_id(&child_id)?;
    let new_position = doc
        .get_node(child_node_key)?
        .parent_key
        .clone()
        .unwrap_or_default();

    let mut fwd_op = set_parent_key_op(&child_id, &new_position);
    fwd_op.op_id = Some(op_id);

    let reverse_ops = vec![set_parent_key_op(&child_id, &old_position)];

    Some(MutationResult {
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

fn list_delete_impl(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    index: usize,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();

    // Capture pre-mutation state
    let child_key = list::get_child_key(doc, nk, index)?;
    let child_id = doc.get_node(child_key)?.id.clone();
    let old_value = list::get(doc, nk, index).unwrap_or(Json::Null);
    let reverse_ops = apply::generate_create_ops_for_subtree(doc, child_key);

    let op_id = id_gen.generate_op_id();

    // Mutate tree
    list::delete(doc, nk, index);

    let mut fwd_op = delete_crdt_op(&child_id);
    fwd_op.op_id = Some(op_id);

    Some(MutationResult {
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

fn list_set_scalar(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    index: usize,
    value: Json,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();

    // Capture pre-mutation state
    let (position, child_key) = match doc.get_node(nk)? {
        node => match &node.data {
            CrdtData::List { children, .. } if index < children.len() => {
                (children[index].0.clone(), children[index].1)
            }
            _ => return None,
        },
    };

    let old_child_id = doc.get_node(child_key)?.id.clone();
    let old_value = list::get(doc, nk, index);
    let mut reverse_ops = apply::generate_create_ops_for_subtree(doc, child_key);

    // Generate IDs
    let new_reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    // Mutate tree
    list::set_with_id(doc, nk, index, value.clone(), &new_reg_id);
    doc.unacked_creates
        .insert((list_id.clone(), position.clone()), op_id.clone());

    // Forward op with intent hack
    let mut fwd_op = create_register_op(&new_reg_id, &list_id, &position, value.clone());
    fwd_op.op_id = Some(op_id);
    fwd_op.intent = Some("set".to_string());
    fwd_op.deleted_id = Some(old_child_id);

    // Reverse ops with intent hack
    if let Some(first) = reverse_ops.first_mut() {
        first.intent = Some("set".to_string());
        first.deleted_id = Some(new_reg_id);
    }

    Some(MutationResult {
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

fn list_set_tagged(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    index: usize,
    value: Json,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();

    // Capture pre-mutation state
    let (position, old_child_key) = match doc.get_node(nk)? {
        node => match &node.data {
            CrdtData::List { children, .. } if index < children.len() => {
                (children[index].0.clone(), children[index].1)
            }
            _ => return None,
        },
    };

    let old_child_id = doc.get_node(old_child_key)?.id.clone();
    let old_value = list::get(doc, nk, index);
    let mut reverse_ops = apply::generate_create_ops_for_subtree(doc, old_child_key);

    // Remove old child
    doc.remove_node_recursive(old_child_key);

    // Create subtree at the same position
    let (child_key, mut create_ops) =
        create_lson_subtree(doc, id_gen, &list_id, &position, &value);

    // Replace in list children
    if let Some(node) = doc.get_node_mut(nk)
        && let CrdtData::List { children, .. } = &mut node.data
        && index < children.len()
    {
        children[index] = (position.clone(), child_key);
    }

    // Track unacked create
    if let Some(first_op) = create_ops.first() {
        if let Some(op_id) = &first_op.op_id {
            doc.unacked_creates
                .insert((list_id.clone(), position), op_id.clone());
        }
    }

    // Intent hack on first CREATE op
    let new_child_id = doc.get_node(child_key)?.id.clone();
    if let Some(first) = create_ops.first_mut() {
        first.intent = Some("set".to_string());
        first.deleted_id = Some(old_child_id);
    }

    // Reverse ops with intent hack
    if let Some(first) = reverse_ops.first_mut() {
        first.intent = Some("set".to_string());
        first.deleted_id = Some(new_child_id);
    }

    Some(MutationResult {
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

fn list_clear_impl(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
) -> Option<MutationResult> {
    let list_id = doc.get_node(nk)?.id.clone();

    // Capture all children's state before mutation
    let children_info: Vec<(NodeKey, String, Json)> = match &doc.get_node(nk)?.data {
        CrdtData::List { children, .. } => children
            .iter()
            .map(|(_pos, ck)| {
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
                (*ck, child_id, value)
            })
            .collect(),
        _ => return None,
    };

    if children_info.is_empty() {
        return Some(MutationResult {
            ops: vec![],
            reverse_ops: vec![],
            update: StorageUpdate::LiveListUpdate {
                node_id: list_id,
                updates: vec![],
            },
        });
    }

    // Generate reverse ops (CREATE chains) BEFORE mutation
    let mut all_reverse = Vec::new();
    for &(ck, _, _) in &children_info {
        all_reverse.extend(apply::generate_create_ops_for_subtree(doc, ck));
    }

    // Generate DELETE_CRDT ops
    let fwd_ops: Vec<Op> = children_info
        .iter()
        .map(|(_, child_id, _)| {
            let op_id = id_gen.generate_op_id();
            let mut op = delete_crdt_op(child_id);
            op.op_id = Some(op_id);
            op
        })
        .collect();

    // Mutate tree
    list::clear(doc, nk);

    let update_entries: Vec<ListUpdateEntry> = children_info
        .iter()
        .map(|(_, _, value)| ListUpdateEntry::Delete {
            index: 0,
            old_value: value.clone(),
        })
        .collect();

    Some(MutationResult {
        ops: fwd_ops,
        reverse_ops: all_reverse,
        update: StorageUpdate::LiveListUpdate {
            node_id: list_id,
            updates: update_entries,
        },
    })
}

// -- Map mutations --

fn map_set_scalar(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    key: &str,
    value: Json,
) -> Option<MutationResult> {
    let map_id = doc.get_node(nk)?.id.clone();
    let old_value = map::get(doc, nk, key);
    let old_child_key = map::get_child(doc, nk, key);
    let old_reverse_ops = old_child_key
        .map(|ck| apply::generate_create_ops_for_subtree(doc, ck))
        .unwrap_or_default();

    let reg_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    // Mutate tree
    map::set_with_id(doc, nk, key, value.clone(), &reg_id);
    doc.unacked_creates
        .insert((map_id.clone(), key.to_string()), op_id.clone());

    let mut fwd_op = create_register_op(&reg_id, &map_id, key, value.clone());
    fwd_op.op_id = Some(op_id);

    let reverse_ops = if !old_reverse_ops.is_empty() {
        old_reverse_ops
    } else {
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

    Some(MutationResult {
        ops: vec![fwd_op],
        reverse_ops,
        update: StorageUpdate::LiveMapUpdate {
            node_id: map_id,
            updates: update_map,
        },
    })
}

fn map_set_tagged(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    key: &str,
    value: Json,
) -> Option<MutationResult> {
    let map_id = doc.get_node(nk)?.id.clone();
    let old_value = map::get(doc, nk, key);
    let old_child_key = map::get_child(doc, nk, key);
    let old_reverse_ops = old_child_key
        .map(|ck| apply::generate_create_ops_for_subtree(doc, ck))
        .unwrap_or_default();

    // Remove old child
    if let Some(ock) = old_child_key {
        if let Some(node) = doc.get_node_mut(nk)
            && let CrdtData::Map { children, .. } = &mut node.data
        {
            children.remove(key);
        }
        doc.remove_node(ock);
    }

    // Create subtree
    let (child_key, create_ops) = create_lson_subtree(doc, id_gen, &map_id, key, &value);

    // Attach child and track unacked
    if let Some(node) = doc.get_node_mut(nk)
        && let CrdtData::Map { children, .. } = &mut node.data
    {
        children.insert(key.to_string(), child_key);
    }
    if let Some(first_op) = create_ops.first() {
        if let Some(op_id) = &first_op.op_id {
            doc.unacked_creates
                .insert((map_id.clone(), key.to_string()), op_id.clone());
        }
    }

    let child_id = doc.get_node(child_key)?.id.clone();
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
            new_value: Json::Null,
        },
    );

    Some(MutationResult {
        ops: create_ops,
        reverse_ops,
        update: StorageUpdate::LiveMapUpdate {
            node_id: map_id,
            updates: update_map,
        },
    })
}

fn map_delete_impl(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    nk: NodeKey,
    key: &str,
) -> Option<MutationResult> {
    let map_id = doc.get_node(nk)?.id.clone();

    let child_key = map::get_child(doc, nk, key)?;
    let child_id = doc.get_node(child_key)?.id.clone();
    let old_value = map::get(doc, nk, key).unwrap_or(Json::Null);
    let reverse_ops = apply::generate_create_ops_for_subtree(doc, child_key);

    let op_id = id_gen.generate_op_id();

    // Mutate tree
    map::delete(doc, nk, key);

    let mut fwd_op = delete_crdt_op(&child_id);
    fwd_op.op_id = Some(op_id);

    let mut update_map = HashMap::new();
    update_map.insert(
        key.to_string(),
        UpdateDelta::Delete {
            old_value,
            deleted_id: None,
        },
    );

    Some(MutationResult {
        ops: vec![fwd_op],
        reverse_ops,
        update: StorageUpdate::LiveMapUpdate {
            node_id: map_id,
            updates: update_map,
        },
    })
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crdt::node::CrdtNode;

    /// Create a Document + IdGenerator with a root object and return the root NodeKey.
    fn setup_doc() -> (Document, IdGenerator) {
        let mut doc = Document::new();
        let root = CrdtNode::new_object("root".to_string());
        doc.insert_root(root);
        let id_gen = IdGenerator::new(0);
        (doc, id_gen)
    }

    // -- Object read/write tests --

    #[test]
    fn test_object_set_and_get_scalar() {
        let (mut doc, mut id_gen) = setup_doc();
        let nk = doc.root_key().unwrap();

        let result = object_set_scalar(&mut doc, &mut id_gen, nk, "name", Json::String("Alice".into()));
        assert!(result.is_some());
        let r = result.unwrap();
        assert_eq!(r.ops.len(), 1);
        assert_eq!(r.reverse_ops.len(), 1); // DELETE_OBJECT_KEY (key didn't exist before)

        // Read back
        let val = object::get_plain(&doc, nk, "name");
        assert_eq!(val, Some(&Json::String("Alice".into())));
    }

    #[test]
    fn test_object_set_overwrite() {
        let (mut doc, mut id_gen) = setup_doc();
        let nk = doc.root_key().unwrap();

        // Set initial value
        object_set_scalar(&mut doc, &mut id_gen, nk, "x", Json::Number(1.0));
        // Overwrite
        let result = object_set_scalar(&mut doc, &mut id_gen, nk, "x", Json::Number(2.0)).unwrap();

        // Reverse should restore old value (UPDATE_OBJECT)
        assert_eq!(result.reverse_ops.len(), 1);
        assert_eq!(object::get_plain(&doc, nk, "x"), Some(&Json::Number(2.0)));
    }

    #[test]
    fn test_object_delete() {
        let (mut doc, mut id_gen) = setup_doc();
        let nk = doc.root_key().unwrap();

        object_set_scalar(&mut doc, &mut id_gen, nk, "name", Json::String("Bob".into()));
        assert!(object::get_plain(&doc, nk, "name").is_some());

        let result = object_delete_impl(&mut doc, &mut id_gen, nk, "name");
        assert!(result.is_some());
        assert!(object::get_plain(&doc, nk, "name").is_none());
    }

    #[test]
    fn test_object_delete_nonexistent_is_noop() {
        let (mut doc, mut id_gen) = setup_doc();
        let nk = doc.root_key().unwrap();

        let result = object_delete_impl(&mut doc, &mut id_gen, nk, "missing");
        assert!(result.is_none());
    }

    // -- List read/write tests --

    #[test]
    fn test_list_push_and_read() {
        let (mut doc, mut id_gen) = setup_doc();
        let root_nk = doc.root_key().unwrap();

        // Create a list as a child of root
        let list_node = CrdtNode::new_list("0:0".to_string());
        let list_nk = doc.insert_node(list_node);
        // Attach to root
        object::set_child(&mut doc, root_nk, "items", list_nk);

        // Push items
        let r1 = list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("a".into()));
        assert!(r1.is_some());
        let r2 = list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("b".into()));
        assert!(r2.is_some());
        let r3 = list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("c".into()));
        assert!(r3.is_some());

        assert_eq!(list::length(&doc, list_nk), 3);
        assert_eq!(list::get(&doc, list_nk, 0), Some(Json::String("a".into())));
        assert_eq!(list::get(&doc, list_nk, 1), Some(Json::String("b".into())));
        assert_eq!(list::get(&doc, list_nk, 2), Some(Json::String("c".into())));
    }

    #[test]
    fn test_list_insert() {
        let (mut doc, mut id_gen) = setup_doc();

        let list_node = CrdtNode::new_list("0:0".to_string());
        let list_nk = doc.insert_node(list_node);

        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("a".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("c".into()));

        // Insert "b" at index 1
        let result = list_insert_scalar(&mut doc, &mut id_gen, list_nk, 1, Json::String("b".into()));
        assert!(result.is_some());

        assert_eq!(list::length(&doc, list_nk), 3);
        assert_eq!(list::get(&doc, list_nk, 0), Some(Json::String("a".into())));
        assert_eq!(list::get(&doc, list_nk, 1), Some(Json::String("b".into())));
        assert_eq!(list::get(&doc, list_nk, 2), Some(Json::String("c".into())));
    }

    #[test]
    fn test_list_delete() {
        let (mut doc, mut id_gen) = setup_doc();

        let list_node = CrdtNode::new_list("0:0".to_string());
        let list_nk = doc.insert_node(list_node);

        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("a".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("b".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("c".into()));

        let result = list_delete_impl(&mut doc, &mut id_gen, list_nk, 1);
        assert!(result.is_some());

        assert_eq!(list::length(&doc, list_nk), 2);
        assert_eq!(list::get(&doc, list_nk, 0), Some(Json::String("a".into())));
        assert_eq!(list::get(&doc, list_nk, 1), Some(Json::String("c".into())));
    }

    #[test]
    fn test_list_move() {
        let (mut doc, mut id_gen) = setup_doc();

        let list_node = CrdtNode::new_list("0:0".to_string());
        let list_nk = doc.insert_node(list_node);

        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("a".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("b".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("c".into()));

        // Move "c" (index 2) to front (index 0)
        let result = list_move_impl(&mut doc, &mut id_gen, list_nk, 2, 0);
        assert!(result.is_some());

        assert_eq!(list::get(&doc, list_nk, 0), Some(Json::String("c".into())));
        assert_eq!(list::get(&doc, list_nk, 1), Some(Json::String("a".into())));
        assert_eq!(list::get(&doc, list_nk, 2), Some(Json::String("b".into())));
    }

    #[test]
    fn test_list_set() {
        let (mut doc, mut id_gen) = setup_doc();

        let list_node = CrdtNode::new_list("0:0".to_string());
        let list_nk = doc.insert_node(list_node);

        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("a".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("b".into()));

        // Replace "b" with "B"
        let result = list_set_scalar(&mut doc, &mut id_gen, list_nk, 1, Json::String("B".into()));
        assert!(result.is_some());
        let r = result.unwrap();
        // set should have intent hack
        assert_eq!(r.ops[0].intent.as_deref(), Some("set"));

        assert_eq!(list::get(&doc, list_nk, 1), Some(Json::String("B".into())));
    }

    #[test]
    fn test_list_clear() {
        let (mut doc, mut id_gen) = setup_doc();

        let list_node = CrdtNode::new_list("0:0".to_string());
        let list_nk = doc.insert_node(list_node);

        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("a".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("b".into()));
        list_push_scalar(&mut doc, &mut id_gen, list_nk, Json::String("c".into()));

        let result = list_clear_impl(&mut doc, &mut id_gen, list_nk);
        assert!(result.is_some());
        let r = result.unwrap();
        assert_eq!(r.ops.len(), 3); // 3 DELETE_CRDT ops
        assert_eq!(list::length(&doc, list_nk), 0);
    }

    // -- Map read/write tests --

    #[test]
    fn test_map_set_and_get() {
        let (mut doc, mut id_gen) = setup_doc();

        let map_node = CrdtNode::new_map("0:0".to_string());
        let map_nk = doc.insert_node(map_node);

        let result = map_set_scalar(&mut doc, &mut id_gen, map_nk, "theme", Json::String("dark".into()));
        assert!(result.is_some());

        assert_eq!(map::get(&doc, map_nk, "theme"), Some(Json::String("dark".into())));
        assert_eq!(map::size(&doc, map_nk), 1);
    }

    #[test]
    fn test_map_delete() {
        let (mut doc, mut id_gen) = setup_doc();

        let map_node = CrdtNode::new_map("0:0".to_string());
        let map_nk = doc.insert_node(map_node);

        map_set_scalar(&mut doc, &mut id_gen, map_nk, "theme", Json::String("dark".into()));
        assert!(map::has(&doc, map_nk, "theme"));

        let result = map_delete_impl(&mut doc, &mut id_gen, map_nk, "theme");
        assert!(result.is_some());
        assert!(!map::has(&doc, map_nk, "theme"));
    }

    #[test]
    fn test_map_delete_nonexistent_is_noop() {
        let (mut doc, mut id_gen) = setup_doc();

        let map_node = CrdtNode::new_map("0:0".to_string());
        let map_nk = doc.insert_node(map_node);

        let result = map_delete_impl(&mut doc, &mut id_gen, map_nk, "missing");
        assert!(result.is_none());
    }

    // -- Op generation tests --

    #[test]
    fn test_ops_have_op_ids() {
        let (mut doc, mut id_gen) = setup_doc();
        let nk = doc.root_key().unwrap();

        let result = object_set_scalar(&mut doc, &mut id_gen, nk, "x", Json::Number(1.0)).unwrap();
        assert!(result.ops[0].op_id.is_some());
        assert!(result.ops[0].op_id.as_ref().unwrap().starts_with("0:"));
    }

    #[test]
    fn test_reverse_ops_generated() {
        let (mut doc, mut id_gen) = setup_doc();
        let nk = doc.root_key().unwrap();

        // Set then overwrite: reverse should contain UPDATE_OBJECT restoring old value
        object_set_scalar(&mut doc, &mut id_gen, nk, "x", Json::Number(1.0));
        let result = object_set_scalar(&mut doc, &mut id_gen, nk, "x", Json::Number(2.0)).unwrap();

        assert!(!result.reverse_ops.is_empty());
        // Reverse op should be UPDATE_OBJECT with the old value
        assert_eq!(result.reverse_ops[0].op_code, crate::types::OpCode::UpdateObject);
    }
}
