use std::collections::BTreeMap;

use crate::arena::NodeKey;
use crate::crdt::node::{CrdtData, CrdtNode};
use crate::document::Document;
use crate::id_gen::IdGenerator;
use crate::ops::serialize::{
    create_list_op, create_map_op, create_object_op, create_register_op,
};
use crate::position;
use crate::types::{Json, Op};

/// Parsed LSON value: either a plain scalar or a tagged live structure.
pub enum LsonValue {
    /// Plain JSON value (no `__lb_type` tag).
    Scalar(Json),
    /// `{ __lb_type: "LiveObject", __lb_data: { ... } }`
    LiveObject(BTreeMap<String, Json>),
    /// `{ __lb_type: "LiveList", __lb_data: [ ... ] }`
    LiveList(Vec<Json>),
    /// `{ __lb_type: "LiveMap", __lb_data: { ... } }`
    LiveMap(BTreeMap<String, Json>),
}

/// Inspect a JSON value for the `__lb_type` / `__lb_data` tagging convention.
/// If the value is a JSON object with both fields, returns the appropriate
/// `LsonValue` variant.  Otherwise returns `LsonValue::Scalar`.
pub fn parse_lson(value: &Json) -> LsonValue {
    if let Json::Object(obj) = value {
        if let (Some(Json::String(lb_type)), Some(lb_data)) =
            (obj.get("__lb_type"), obj.get("__lb_data"))
        {
            match lb_type.as_str() {
                "LiveObject" => {
                    if let Json::Object(data) = lb_data {
                        return LsonValue::LiveObject(data.clone());
                    }
                }
                "LiveList" => {
                    if let Json::Array(items) = lb_data {
                        return LsonValue::LiveList(items.clone());
                    }
                }
                "LiveMap" => {
                    if let Json::Object(entries) = lb_data {
                        return LsonValue::LiveMap(entries.clone());
                    }
                }
                _ => {}
            }
        }
    }
    LsonValue::Scalar(value.clone())
}

/// Recursively create CRDT nodes in `doc` from an LSON-tagged JSON value.
///
/// Returns `(node_key, ops)` where `node_key` is the arena key of the
/// newly-created root of the sub-tree, and `ops` is the flat pre-order
/// DFS list of CREATE_* ops that must be sent to the server.
///
/// Every created node has its `parent_id` and `parent_key` set.
pub fn create_lson_subtree(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    value: &Json,
) -> (NodeKey, Vec<Op>) {
    match parse_lson(value) {
        LsonValue::Scalar(v) => create_scalar(doc, id_gen, parent_id, parent_key, v),
        LsonValue::LiveObject(data) => {
            create_live_object(doc, id_gen, parent_id, parent_key, data)
        }
        LsonValue::LiveList(items) => create_live_list(doc, id_gen, parent_id, parent_key, items),
        LsonValue::LiveMap(entries) => {
            create_live_map(doc, id_gen, parent_id, parent_key, entries)
        }
    }
}

/// Create a Register node for a plain scalar value.
fn create_scalar(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    value: Json,
) -> (NodeKey, Vec<Op>) {
    let node_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    let mut node = CrdtNode::new_register(node_id.clone(), value.clone());
    node.parent_id = Some(parent_id.to_string());
    node.parent_key = Some(parent_key.to_string());
    let key = doc.insert_node(node);

    let mut op = create_register_op(&node_id, parent_id, parent_key, value);
    op.op_id = Some(op_id);

    (key, vec![op])
}

/// Create a LiveObject node with inline scalar data and recursive children.
fn create_live_object(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    data: BTreeMap<String, Json>,
) -> (NodeKey, Vec<Op>) {
    let node_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    let mut obj_node = CrdtNode::new_object(node_id.clone());
    obj_node.parent_id = Some(parent_id.to_string());
    obj_node.parent_key = Some(parent_key.to_string());
    let obj_key = doc.insert_node(obj_node);

    let mut inline_data = BTreeMap::new();
    let mut child_ops = Vec::new();

    for (prop, val) in &data {
        match parse_lson(val) {
            LsonValue::Scalar(v) => {
                // Scalar children become inline data on the CREATE_OBJECT op
                // and are stored as Register children in the document.
                inline_data.insert(prop.clone(), v.clone());

                let reg_id = id_gen.generate_id();
                let mut reg = CrdtNode::new_register(reg_id, v);
                reg.parent_id = Some(node_id.clone());
                reg.parent_key = Some(prop.clone());
                let reg_key = doc.insert_node(reg);

                if let Some(node) = doc.get_node_mut(obj_key)
                    && let CrdtData::Object { children, .. } = &mut node.data
                {
                    children.insert(prop.clone(), reg_key);
                }
            }
            _ => {
                // Nested CRDT: recursively create subtree
                let (child_key, ops) =
                    create_lson_subtree(doc, id_gen, &node_id, prop, val);

                if let Some(node) = doc.get_node_mut(obj_key)
                    && let CrdtData::Object { children, .. } = &mut node.data
                {
                    children.insert(prop.clone(), child_key);
                }

                child_ops.extend(ops);
            }
        }
    }

    let mut create_op = create_object_op(&node_id, parent_id, parent_key, inline_data);
    create_op.op_id = Some(op_id);

    let mut ops = vec![create_op];
    ops.extend(child_ops);
    (obj_key, ops)
}

/// Create a LiveList node with positionally-indexed children.
fn create_live_list(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    items: Vec<Json>,
) -> (NodeKey, Vec<Op>) {
    let node_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    let mut list_node = CrdtNode::new_list(node_id.clone());
    list_node.parent_id = Some(parent_id.to_string());
    list_node.parent_key = Some(parent_key.to_string());
    let list_key = doc.insert_node(list_node);

    let mut create_op = create_list_op(&node_id, parent_id, parent_key);
    create_op.op_id = Some(op_id);

    let mut ops = vec![create_op];
    let mut prev_pos: Option<String> = None;

    for item in &items {
        let pos = position::make_position(prev_pos.as_deref(), None);

        let (child_key, mut child_ops) =
            create_lson_subtree(doc, id_gen, &node_id, &pos, item);

        // Match JS HACK_addIntentAndDeletedIdToOperation: each child's first
        // op gets intent: "set" so ACK processing uses #applySetAck instead
        // of #applyInsertAck. Without this, a subsequent liveList.set() that
        // supersedes the initial item causes a spurious re-insertion on ACK.
        if let Some(first) = child_ops.first_mut() {
            first.intent = Some("set".to_string());
        }

        if let Some(node) = doc.get_node_mut(list_key)
            && let CrdtData::List { children, .. } = &mut node.data
        {
            children.push((pos.clone(), child_key));
        }

        ops.extend(child_ops);
        prev_pos = Some(pos);
    }

    (list_key, ops)
}

/// Create a LiveMap node with keyed children.
fn create_live_map(
    doc: &mut Document,
    id_gen: &mut IdGenerator,
    parent_id: &str,
    parent_key: &str,
    entries: BTreeMap<String, Json>,
) -> (NodeKey, Vec<Op>) {
    let node_id = id_gen.generate_id();
    let op_id = id_gen.generate_op_id();

    let mut map_node = CrdtNode::new_map(node_id.clone());
    map_node.parent_id = Some(parent_id.to_string());
    map_node.parent_key = Some(parent_key.to_string());
    let map_key = doc.insert_node(map_node);

    let mut create_op = create_map_op(&node_id, parent_id, parent_key);
    create_op.op_id = Some(op_id);

    let mut ops = vec![create_op];

    for (entry_key, val) in &entries {
        let (child_key, child_ops) =
            create_lson_subtree(doc, id_gen, &node_id, entry_key, val);

        if let Some(node) = doc.get_node_mut(map_key)
            && let CrdtData::Map { children, .. } = &mut node.data
        {
            children.insert(entry_key.clone(), child_key);
        }

        ops.extend(child_ops);
    }

    (map_key, ops)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::id_gen::IdGenerator;

    #[test]
    fn parse_lson_scalar() {
        let val = Json::Number(42.0);
        assert!(matches!(parse_lson(&val), LsonValue::Scalar(_)));
    }

    #[test]
    fn parse_lson_live_object() {
        let mut obj = BTreeMap::new();
        obj.insert("__lb_type".to_string(), Json::String("LiveObject".to_string()));
        let mut data = BTreeMap::new();
        data.insert("x".to_string(), Json::Number(1.0));
        obj.insert("__lb_data".to_string(), Json::Object(data));
        let val = Json::Object(obj);

        match parse_lson(&val) {
            LsonValue::LiveObject(data) => {
                assert_eq!(data.get("x"), Some(&Json::Number(1.0)));
            }
            _ => panic!("expected LiveObject"),
        }
    }

    #[test]
    fn parse_lson_live_list() {
        let mut obj = BTreeMap::new();
        obj.insert("__lb_type".to_string(), Json::String("LiveList".to_string()));
        obj.insert(
            "__lb_data".to_string(),
            Json::Array(vec![Json::Number(1.0), Json::Number(2.0)]),
        );
        let val = Json::Object(obj);

        match parse_lson(&val) {
            LsonValue::LiveList(items) => {
                assert_eq!(items.len(), 2);
            }
            _ => panic!("expected LiveList"),
        }
    }

    #[test]
    fn parse_lson_live_map() {
        let mut obj = BTreeMap::new();
        obj.insert("__lb_type".to_string(), Json::String("LiveMap".to_string()));
        let mut data = BTreeMap::new();
        data.insert("a".to_string(), Json::String("hello".to_string()));
        obj.insert("__lb_data".to_string(), Json::Object(data));
        let val = Json::Object(obj);

        match parse_lson(&val) {
            LsonValue::LiveMap(entries) => {
                assert_eq!(
                    entries.get("a"),
                    Some(&Json::String("hello".to_string()))
                );
            }
            _ => panic!("expected LiveMap"),
        }
    }

    #[test]
    fn create_subtree_scalar() {
        let mut doc = Document::new();
        let root = CrdtNode::new_object("root".to_string());
        let root_key = doc.insert_root(root);
        let mut id_gen = IdGenerator::new(1);

        let val = Json::Number(42.0);
        let (node_key, ops) = create_lson_subtree(&mut doc, &mut id_gen, "root", "x", &val);

        assert_eq!(ops.len(), 1);
        assert!(doc.get_node(node_key).is_some());
        let node = doc.get_node(node_key).unwrap();
        assert_eq!(node.parent_id.as_deref(), Some("root"));
        assert_eq!(node.parent_key.as_deref(), Some("x"));
        assert!(matches!(&node.data, CrdtData::Register { data } if *data == Json::Number(42.0)));

        // Verify op
        assert_eq!(ops[0].op_code, crate::types::OpCode::CreateRegister);
        assert_eq!(ops[0].parent_id.as_deref(), Some("root"));
        assert_eq!(ops[0].parent_key.as_deref(), Some("x"));
        assert!(ops[0].op_id.is_some());
        let _ = root_key;
    }

    #[test]
    fn create_subtree_live_object() {
        let mut doc = Document::new();
        let root = CrdtNode::new_object("root".to_string());
        doc.insert_root(root);
        let mut id_gen = IdGenerator::new(1);

        // Build { __lb_type: "LiveObject", __lb_data: { name: "Alice", age: 30 } }
        let mut data = BTreeMap::new();
        data.insert("name".to_string(), Json::String("Alice".to_string()));
        data.insert("age".to_string(), Json::Number(30.0));
        let mut tagged = BTreeMap::new();
        tagged.insert("__lb_type".to_string(), Json::String("LiveObject".to_string()));
        tagged.insert("__lb_data".to_string(), Json::Object(data));
        let val = Json::Object(tagged);

        let (node_key, ops) = create_lson_subtree(&mut doc, &mut id_gen, "root", "user", &val);

        // First op is CREATE_OBJECT
        assert_eq!(ops[0].op_code, crate::types::OpCode::CreateObject);
        assert_eq!(ops[0].parent_id.as_deref(), Some("root"));
        assert_eq!(ops[0].parent_key.as_deref(), Some("user"));
        // Inline data has "age" and "name"
        if let Some(Json::Object(inline)) = &ops[0].data {
            assert!(inline.contains_key("name"));
            assert!(inline.contains_key("age"));
        } else {
            panic!("expected inline data on CREATE_OBJECT");
        }

        // The object node should have 2 register children
        let node = doc.get_node(node_key).unwrap();
        match &node.data {
            CrdtData::Object { children, .. } => {
                assert_eq!(children.len(), 2);
            }
            _ => panic!("expected Object"),
        }
    }

    #[test]
    fn create_subtree_nested_object_in_object() {
        let mut doc = Document::new();
        let root = CrdtNode::new_object("root".to_string());
        doc.insert_root(root);
        let mut id_gen = IdGenerator::new(1);

        // { __lb_type: "LiveObject", __lb_data: { nested: { __lb_type: "LiveObject", __lb_data: { x: 1 } } } }
        let mut inner_data = BTreeMap::new();
        inner_data.insert("x".to_string(), Json::Number(1.0));
        let mut inner_tagged = BTreeMap::new();
        inner_tagged.insert("__lb_type".to_string(), Json::String("LiveObject".to_string()));
        inner_tagged.insert("__lb_data".to_string(), Json::Object(inner_data));

        let mut outer_data = BTreeMap::new();
        outer_data.insert("nested".to_string(), Json::Object(inner_tagged));
        let mut outer_tagged = BTreeMap::new();
        outer_tagged.insert("__lb_type".to_string(), Json::String("LiveObject".to_string()));
        outer_tagged.insert("__lb_data".to_string(), Json::Object(outer_data));
        let val = Json::Object(outer_tagged);

        let (node_key, ops) = create_lson_subtree(&mut doc, &mut id_gen, "root", "top", &val);

        // Should have: CREATE_OBJECT (outer), CREATE_OBJECT (inner)
        assert_eq!(ops.len(), 2);
        assert_eq!(ops[0].op_code, crate::types::OpCode::CreateObject);
        assert_eq!(ops[1].op_code, crate::types::OpCode::CreateObject);

        // Inner object's parent should be outer object
        assert_eq!(ops[1].parent_key.as_deref(), Some("nested"));
        // Outer object's inline data should be empty (nested is a CRDT, not scalar)
        if let Some(Json::Object(inline)) = &ops[0].data {
            assert!(inline.is_empty());
        }

        let _ = node_key;
    }

    #[test]
    fn create_subtree_live_list() {
        let mut doc = Document::new();
        let root = CrdtNode::new_object("root".to_string());
        doc.insert_root(root);
        let mut id_gen = IdGenerator::new(1);

        // { __lb_type: "LiveList", __lb_data: [10, 20, 30] }
        let mut tagged = BTreeMap::new();
        tagged.insert("__lb_type".to_string(), Json::String("LiveList".to_string()));
        tagged.insert(
            "__lb_data".to_string(),
            Json::Array(vec![
                Json::Number(10.0),
                Json::Number(20.0),
                Json::Number(30.0),
            ]),
        );
        let val = Json::Object(tagged);

        let (node_key, ops) = create_lson_subtree(&mut doc, &mut id_gen, "root", "items", &val);

        // CREATE_LIST + 3 CREATE_REGISTER
        assert_eq!(ops.len(), 4);
        assert_eq!(ops[0].op_code, crate::types::OpCode::CreateList);
        for i in 1..=3 {
            assert_eq!(ops[i].op_code, crate::types::OpCode::CreateRegister);
        }

        // Verify list has 3 children
        let node = doc.get_node(node_key).unwrap();
        match &node.data {
            CrdtData::List { children, .. } => {
                assert_eq!(children.len(), 3);
                // Positions should be sorted
                let positions: Vec<&str> =
                    children.iter().map(|(pos, _)| pos.as_str()).collect();
                assert!(positions[0] < positions[1]);
                assert!(positions[1] < positions[2]);
            }
            _ => panic!("expected List"),
        }
    }

    #[test]
    fn create_subtree_live_map() {
        let mut doc = Document::new();
        let root = CrdtNode::new_object("root".to_string());
        doc.insert_root(root);
        let mut id_gen = IdGenerator::new(1);

        // { __lb_type: "LiveMap", __lb_data: { a: 1, b: 2 } }
        let mut data = BTreeMap::new();
        data.insert("a".to_string(), Json::Number(1.0));
        data.insert("b".to_string(), Json::Number(2.0));
        let mut tagged = BTreeMap::new();
        tagged.insert("__lb_type".to_string(), Json::String("LiveMap".to_string()));
        tagged.insert("__lb_data".to_string(), Json::Object(data));
        let val = Json::Object(tagged);

        let (node_key, ops) = create_lson_subtree(&mut doc, &mut id_gen, "root", "mymap", &val);

        // CREATE_MAP + 2 CREATE_REGISTER
        assert_eq!(ops.len(), 3);
        assert_eq!(ops[0].op_code, crate::types::OpCode::CreateMap);

        let node = doc.get_node(node_key).unwrap();
        match &node.data {
            CrdtData::Map { children, .. } => {
                assert_eq!(children.len(), 2);
            }
            _ => panic!("expected Map"),
        }
    }
}
