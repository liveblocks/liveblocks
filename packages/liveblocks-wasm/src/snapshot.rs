use std::collections::{BTreeMap, HashMap};

use crate::arena::NodeKey;
use crate::crdt::node::{CrdtData, CrdtNode};
use crate::document::Document;
use crate::types::{CrdtType, IdTuple, Json, SerializedCrdt};

/// Deserialize a flat list of (id, SerializedCrdt) tuples into a Document.
///
/// Items can appear in any order — children before parents is valid.
/// The root node has id "root" and no parent.
pub fn deserialize(items: &[IdTuple<SerializedCrdt>]) -> Document {
    let mut doc = Document::new();

    // First pass: create all nodes in the arena
    let mut key_map: HashMap<String, NodeKey> = HashMap::new();
    for (id, crdt) in items {
        let node = match crdt.crdt_type {
            CrdtType::Object => {
                let mut n = CrdtNode::new_object(id.clone());
                n.parent_id = crdt.parent_id.clone();
                n.parent_key = crdt.parent_key.clone();

                // If object has inline data, create register children for each key
                // We'll attach them in the second pass
                n
            }
            CrdtType::List => {
                let mut n = CrdtNode::new_list(id.clone());
                n.parent_id = crdt.parent_id.clone();
                n.parent_key = crdt.parent_key.clone();
                n
            }
            CrdtType::Map => {
                let mut n = CrdtNode::new_map(id.clone());
                n.parent_id = crdt.parent_id.clone();
                n.parent_key = crdt.parent_key.clone();
                n
            }
            CrdtType::Register => {
                let data = crdt.data.clone().unwrap_or(Json::Null);
                let mut n = CrdtNode::new_register(id.clone(), data);
                n.parent_id = crdt.parent_id.clone();
                n.parent_key = crdt.parent_key.clone();
                n
            }
        };

        let key = if crdt.parent_id.is_none() {
            doc.insert_root(node)
        } else {
            doc.insert_node(node)
        };
        key_map.insert(id.clone(), key);
    }

    // Create inline register nodes for Object data
    for (id, crdt) in items {
        if crdt.crdt_type == CrdtType::Object
            && let Some(Json::Object(data)) = &crdt.data
        {
            for (prop, value) in data {
                let reg_id = format!("{}:{}", id, prop);
                let mut reg = CrdtNode::new_register(reg_id.clone(), value.clone());
                reg.parent_id = Some(id.clone());
                reg.parent_key = Some(prop.clone());
                let reg_key = doc.insert_node(reg);
                key_map.insert(reg_id, reg_key);

                // Attach to parent object
                if let Some(&parent_key) = key_map.get(id)
                    && let Some(parent_node) = doc.get_node_mut(parent_key)
                    && let CrdtData::Object { children, .. } = &mut parent_node.data
                {
                    children.insert(prop.clone(), reg_key);
                }
            }
        }
    }

    // Second pass: wire up parent-child relationships for non-inline nodes
    for (id, crdt) in items {
        let Some(parent_id) = &crdt.parent_id else {
            continue;
        };
        let Some(&child_key) = key_map.get(id) else {
            continue;
        };
        let Some(&parent_key) = key_map.get(parent_id) else {
            continue;
        };
        let child_parent_key = crdt.parent_key.clone().unwrap_or_default();

        let Some(parent_node) = doc.get_node_mut(parent_key) else {
            continue;
        };

        match &mut parent_node.data {
            CrdtData::Object { children, .. } => {
                children.insert(child_parent_key, child_key);
            }
            CrdtData::List { children, .. } => {
                // Insert sorted by position
                let pos = child_parent_key;
                let insert_idx = children
                    .iter()
                    .position(|(p, _)| p.as_str() > pos.as_str())
                    .unwrap_or(children.len());
                children.insert(insert_idx, (pos, child_key));
            }
            CrdtData::Map { children, .. } => {
                children.insert(child_parent_key, child_key);
            }
            CrdtData::Register { .. } => {
                // Registers don't have children
            }
        }
    }

    doc
}

/// Serialize a Document to a flat list of (id, SerializedCrdt) tuples.
///
/// Traverses all nodes in the arena and produces the serialized form.
pub fn serialize(doc: &Document) -> Vec<IdTuple<SerializedCrdt>> {
    let mut result = Vec::new();

    // Start from root and traverse recursively
    if let Some(root_key) = doc.root_key() {
        serialize_node(doc, root_key, &mut result);
    }

    result
}

/// Recursively serialize a node and all its children.
fn serialize_node(doc: &Document, key: NodeKey, result: &mut Vec<IdTuple<SerializedCrdt>>) {
    let Some(node) = doc.get_node(key) else {
        return;
    };

    match &node.data {
        CrdtData::Object { children, .. } => {
            // object::serialize() folds register children into `data`,
            // so we only recurse into non-register children (nested
            // objects, lists, maps). Register children are NOT emitted
            // separately — they are inline data on the object node.
            let serialized = crate::crdt::object::serialize(doc, key);
            if let Some(s) = serialized {
                result.push((node.id.clone(), s));
            }
            for child_key in children.values() {
                if let Some(child) = doc.get_node(*child_key) {
                    if !matches!(&child.data, CrdtData::Register { .. }) {
                        serialize_node(doc, *child_key, result);
                    }
                }
            }
        }
        CrdtData::List { children, .. } => {
            let serialized = crate::crdt::list::serialize(doc, key);
            if let Some(s) = serialized {
                result.push((node.id.clone(), s));
            }
            // Recurse into children
            for (_pos, child_key) in children {
                serialize_node(doc, *child_key, result);
            }
        }
        CrdtData::Map { children, .. } => {
            let serialized = crate::crdt::map::serialize(doc, key);
            if let Some(s) = serialized {
                result.push((node.id.clone(), s));
            }
            // Recurse into children
            for child_key in children.values() {
                serialize_node(doc, *child_key, result);
            }
        }
        CrdtData::Register { .. } => {
            let serialized = crate::crdt::register::serialize(doc, key);
            if let Some(s) = serialized {
                result.push((node.id.clone(), s));
            }
        }
    }
}

/// Convert a CRDT node to PlainLson format.
///
/// - LiveObject → `{liveblocksType: "LiveObject", data: {...}}`
/// - LiveList → `{liveblocksType: "LiveList", data: [...]}`
/// - LiveMap → `{liveblocksType: "LiveMap", data: {...}}`
/// - Register → the plain JSON value (no wrapper)
pub fn to_plain_lson(doc: &Document, key: NodeKey) -> Option<Json> {
    let node = doc.get_node(key)?;

    match &node.data {
        CrdtData::Object { children, .. } => {
            let mut data = BTreeMap::new();
            for (prop, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let value = match &child.data {
                        CrdtData::Register { data } => data.clone(),
                        _ => to_plain_lson(doc, *child_key)?,
                    };
                    data.insert(prop.clone(), value);
                }
            }

            let mut wrapper = BTreeMap::new();
            wrapper.insert(
                "liveblocksType".to_string(),
                Json::String("LiveObject".to_string()),
            );
            wrapper.insert("data".to_string(), Json::Object(data));
            Some(Json::Object(wrapper))
        }
        CrdtData::List { children, .. } => {
            let mut items = Vec::new();
            for (_pos, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let value = match &child.data {
                        CrdtData::Register { data } => data.clone(),
                        _ => to_plain_lson(doc, *child_key)?,
                    };
                    items.push(value);
                }
            }

            let mut wrapper = BTreeMap::new();
            wrapper.insert(
                "liveblocksType".to_string(),
                Json::String("LiveList".to_string()),
            );
            wrapper.insert("data".to_string(), Json::Array(items));
            Some(Json::Object(wrapper))
        }
        CrdtData::Map { children, .. } => {
            let mut data = BTreeMap::new();
            for (map_key, child_key) in children {
                if let Some(child) = doc.get_node(*child_key) {
                    let value = match &child.data {
                        CrdtData::Register { data } => data.clone(),
                        _ => to_plain_lson(doc, *child_key)?,
                    };
                    data.insert(map_key.clone(), value);
                }
            }

            let mut wrapper = BTreeMap::new();
            wrapper.insert(
                "liveblocksType".to_string(),
                Json::String("LiveMap".to_string()),
            );
            wrapper.insert("data".to_string(), Json::Object(data));
            Some(Json::Object(wrapper))
        }
        CrdtData::Register { data } => Some(data.clone()),
    }
}
