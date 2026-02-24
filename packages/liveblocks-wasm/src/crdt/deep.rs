//! Deep creation of CRDT nodes from nested JSON values.
//!
//! When JS code does `liveObject.set("key", new LiveObject({...}))`, the WASM
//! bridge receives a flat JSON value. This module recreates the proper CRDT
//! tree structure:
//!
//! - JSON objects → LiveObject nodes (scalar props inline, nested props as children)
//! - JSON arrays → LiveList nodes (items as register/node children)
//! - Scalars → LiveRegister nodes (unchanged)

use std::collections::BTreeMap;

use crate::arena::NodeKey;
use crate::crdt::node::{CrdtData, CrdtNode};
use crate::document::Document;
use crate::id_gen::IdGenerator;
use crate::position;
use crate::types::{Json, Op};
use crate::ops::serialize::{create_object_op, create_list_op, create_map_op, create_register_op};

/// Result of deep-creating a value: the root node key and all generated ops.
pub struct DeepCreateResult {
    pub node_key: NodeKey,
    pub ops: Vec<Op>,
}

/// Create proper CRDT nodes for a JSON value and return the root key + ops.
///
/// - `Json::Object` with `__liveType: "LiveMap"` → LiveMap with children
/// - `Json::Object` → LiveObject with children (recursively)
/// - `Json::Array` → LiveList with register/node children
/// - Scalar → LiveRegister
pub fn deep_create_value(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    value: &Json,
) -> DeepCreateResult {
    match value {
        Json::Object(map) => {
            // Check for __liveType marker from TypeScript LiveMap/LiveList wrappers
            if let Some(Json::String(live_type)) = map.get("__liveType") {
                if live_type == "LiveMap" {
                    if let Some(Json::Object(data)) = map.get("data") {
                        return deep_create_map(doc, id_gen, parent_id, parent_key, data);
                    }
                }
            }
            deep_create_object(doc, id_gen, parent_id, parent_key, map)
        }
        Json::Array(arr) => deep_create_list(doc, id_gen, parent_id, parent_key, arr),
        _ => deep_create_register(doc, id_gen, parent_id, parent_key, value),
    }
}

/// Create a LiveObject node from a JSON object.
///
/// Scalar properties are stored as register children (matching Rust document model)
/// but the CreateObject op carries them in its `data` field (matching wire format).
/// Nested objects/arrays become proper child CRDT nodes.
fn deep_create_object(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    map: &BTreeMap<String, Json>,
) -> DeepCreateResult {
    let node_id = id_gen.generate_id();
    let mut ops = Vec::new();

    // Separate scalar and nested properties
    let mut scalar_data = BTreeMap::new();
    let mut nested_props: Vec<(String, Json)> = Vec::new();

    for (k, v) in map {
        match v {
            Json::Object(_) | Json::Array(_) => {
                nested_props.push((k.clone(), v.clone()));
            }
            _ => {
                scalar_data.insert(k.clone(), v.clone());
            }
        }
    }

    // Create the object node
    let mut obj_node = CrdtNode::new_object(node_id.clone());
    obj_node.parent_id = Some(parent_id.to_string());
    obj_node.parent_key = Some(parent_key.to_string());
    let obj_key = doc.insert_node(obj_node);

    // CreateObject op with scalar data
    let mut op = create_object_op(&node_id, parent_id, parent_key, scalar_data.clone());
    op.op_id = Some(id_gen.generate_op_id());
    ops.push(op);

    // Create register children for scalar properties
    for (prop, val) in &scalar_data {
        let reg_id = format!("{}:{}", node_id, prop);
        let mut reg_node = CrdtNode::new_register(reg_id, val.clone());
        reg_node.parent_id = Some(node_id.clone());
        reg_node.parent_key = Some(prop.clone());
        let reg_key = doc.insert_node(reg_node);

        if let Some(node) = doc.get_node_mut(obj_key)
            && let CrdtData::Object { children, .. } = &mut node.data
        {
            children.insert(prop.clone(), reg_key);
        }
    }

    // Recursively create nested children
    for (prop, val) in &nested_props {
        let result = deep_create_value(doc, id_gen, &node_id, prop, val);

        // Attach child to parent object
        if let Some(node) = doc.get_node_mut(obj_key)
            && let CrdtData::Object { children, .. } = &mut node.data
        {
            children.insert(prop.clone(), result.node_key);
        }

        ops.extend(result.ops);
    }

    DeepCreateResult {
        node_key: obj_key,
        ops,
    }
}

/// Create a LiveList node from a JSON array.
fn deep_create_list(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    arr: &[Json],
) -> DeepCreateResult {
    let node_id = id_gen.generate_id();
    let mut ops = Vec::new();

    // Create the list node
    let mut list_node = CrdtNode::new_list(node_id.clone());
    list_node.parent_id = Some(parent_id.to_string());
    list_node.parent_key = Some(parent_key.to_string());
    let list_key = doc.insert_node(list_node);

    // CreateList op
    let mut op = create_list_op(&node_id, parent_id, parent_key);
    op.op_id = Some(id_gen.generate_op_id());
    ops.push(op);

    // Add items
    let mut last_pos: Option<String> = None;
    for item in arr {
        let pos = match &last_pos {
            Some(p) => position::after(p),
            None => position::make_position(None, None),
        };

        let result = deep_create_value(doc, id_gen, &node_id, &pos, item);

        // Attach child to list
        if let Some(node) = doc.get_node_mut(list_key)
            && let CrdtData::List { children, .. } = &mut node.data
        {
            children.push((pos.clone(), result.node_key));
        }

        ops.extend(result.ops);
        last_pos = Some(pos);
    }

    DeepCreateResult {
        node_key: list_key,
        ops,
    }
}

/// Create a LiveMap node from a JSON object (entries).
fn deep_create_map(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    entries: &BTreeMap<String, Json>,
) -> DeepCreateResult {
    let node_id = id_gen.generate_id();
    let mut ops = Vec::new();

    // Create the map node
    let mut map_node = CrdtNode::new_map(node_id.clone());
    map_node.parent_id = Some(parent_id.to_string());
    map_node.parent_key = Some(parent_key.to_string());
    let map_key = doc.insert_node(map_node);

    // CreateMap op
    let mut op = create_map_op(&node_id, parent_id, parent_key);
    op.op_id = Some(id_gen.generate_op_id());
    ops.push(op);

    // Add entries
    for (entry_key, value) in entries {
        let result = deep_create_value(doc, id_gen, &node_id, entry_key, value);

        // Attach child to map
        if let Some(node) = doc.get_node_mut(map_key)
            && let CrdtData::Map { children, .. } = &mut node.data
        {
            children.insert(entry_key.clone(), result.node_key);
        }

        ops.extend(result.ops);
    }

    DeepCreateResult {
        node_key: map_key,
        ops,
    }
}

// ---- Ops-only generation (no arena insertion) ----
// Used when the caller wants apply_op to handle node creation and update generation.

/// Generate ops for a JSON value WITHOUT creating nodes in the document arena.
/// The ops have correct IDs and parent references; apply_op will create the nodes.
pub fn deep_generate_ops(
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    value: &Json,
) -> Vec<Op> {
    match value {
        Json::Object(map) => {
            if let Some(Json::String(live_type)) = map.get("__liveType") {
                if live_type == "LiveMap" {
                    if let Some(Json::Object(data)) = map.get("data") {
                        return gen_ops_map(id_gen, parent_id, parent_key, data);
                    }
                }
            }
            gen_ops_object(id_gen, parent_id, parent_key, map)
        }
        Json::Array(arr) => gen_ops_list(id_gen, parent_id, parent_key, arr),
        _ => gen_ops_register(id_gen, parent_id, parent_key, value),
    }
}

fn gen_ops_object(
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    map: &BTreeMap<String, Json>,
) -> Vec<Op> {
    let node_id = id_gen.generate_id();
    let mut ops = Vec::new();

    let mut scalar_data = BTreeMap::new();
    let mut nested_props: Vec<(String, Json)> = Vec::new();
    for (k, v) in map {
        match v {
            Json::Object(_) | Json::Array(_) => nested_props.push((k.clone(), v.clone())),
            _ => { scalar_data.insert(k.clone(), v.clone()); }
        }
    }

    let mut op = create_object_op(&node_id, parent_id, parent_key, scalar_data);
    op.op_id = Some(id_gen.generate_op_id());
    ops.push(op);

    for (prop, val) in &nested_props {
        ops.extend(deep_generate_ops(id_gen, &node_id, prop, val));
    }
    ops
}

fn gen_ops_list(
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    arr: &[Json],
) -> Vec<Op> {
    let node_id = id_gen.generate_id();
    let mut ops = Vec::new();

    let mut op = create_list_op(&node_id, parent_id, parent_key);
    op.op_id = Some(id_gen.generate_op_id());
    ops.push(op);

    let mut last_pos: Option<String> = None;
    for item in arr {
        let pos = match &last_pos {
            Some(p) => position::after(p),
            None => position::make_position(None, None),
        };
        ops.extend(deep_generate_ops(id_gen, &node_id, &pos, item));
        last_pos = Some(pos);
    }
    ops
}

fn gen_ops_map(
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    entries: &BTreeMap<String, Json>,
) -> Vec<Op> {
    let node_id = id_gen.generate_id();
    let mut ops = Vec::new();

    let mut op = create_map_op(&node_id, parent_id, parent_key);
    op.op_id = Some(id_gen.generate_op_id());
    ops.push(op);

    for (entry_key, value) in entries {
        ops.extend(deep_generate_ops(id_gen, &node_id, entry_key, value));
    }
    ops
}

fn gen_ops_register(
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    value: &Json,
) -> Vec<Op> {
    let node_id = id_gen.generate_id();
    let mut op = create_register_op(&node_id, parent_id, parent_key, value.clone());
    op.op_id = Some(id_gen.generate_op_id());
    vec![op]
}

/// Create a LiveRegister node from a scalar JSON value.
fn deep_create_register(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    value: &Json,
) -> DeepCreateResult {
    let node_id = id_gen.generate_id();

    let mut reg_node = CrdtNode::new_register(node_id.clone(), value.clone());
    reg_node.parent_id = Some(parent_id.to_string());
    reg_node.parent_key = Some(parent_key.to_string());
    let reg_key = doc.insert_node(reg_node);

    let mut op = create_register_op(&node_id, parent_id, parent_key, value.clone());
    op.op_id = Some(id_gen.generate_op_id());

    DeepCreateResult {
        node_key: reg_key,
        ops: vec![op],
    }
}
