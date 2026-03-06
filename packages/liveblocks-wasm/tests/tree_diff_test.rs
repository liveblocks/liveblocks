use liveblocks_wasm::tree_diff;
use liveblocks_wasm::types::{CrdtType, Json, OpCode, SerializedCrdt};
use std::collections::BTreeMap;

fn root_crdt() -> (String, SerializedCrdt) {
    (
        "root".to_string(),
        SerializedCrdt {
            crdt_type: CrdtType::Object,
            parent_id: None,
            parent_key: None,
            data: Some(Json::Object(Default::default())),
        },
    )
}

fn root_crdt_with_data(data: BTreeMap<String, Json>) -> (String, SerializedCrdt) {
    (
        "root".to_string(),
        SerializedCrdt {
            crdt_type: CrdtType::Object,
            parent_id: None,
            parent_key: None,
            data: Some(Json::Object(data)),
        },
    )
}

// ---- Identical trees ----

#[test]
fn identical_trees_produce_no_ops() {
    let current = vec![root_crdt()];
    let new_items = vec![root_crdt()];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    assert!(ops.is_empty(), "Expected no ops, got: {:?}", ops);
}

#[test]
fn identical_trees_with_data_produce_no_ops() {
    let mut data = BTreeMap::new();
    data.insert("x".to_string(), Json::Number(1.0));
    let current = vec![root_crdt_with_data(data.clone())];
    let new_items = vec![root_crdt_with_data(data)];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    assert!(ops.is_empty(), "Expected no ops, got: {:?}", ops);
}

// ---- Node added ----

#[test]
fn new_node_produces_create_op() {
    let current = vec![root_crdt()];
    let new_items = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: Some("root".to_string()),
                parent_key: Some("child".to_string()),
                data: Some(Json::Object(Default::default())),
            },
        ),
    ];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    assert!(!ops.is_empty());
    let create_ops: Vec<_> = ops
        .iter()
        .filter(|op| op.op_code == OpCode::CreateObject)
        .collect();
    assert_eq!(create_ops.len(), 1);
    assert_eq!(create_ops[0].id, "0:1");
    assert_eq!(create_ops[0].parent_id, Some("root".to_string()));
    assert_eq!(create_ops[0].parent_key, Some("child".to_string()));
}

#[test]
fn new_list_produces_create_list_op() {
    let current = vec![root_crdt()];
    let new_items = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::List,
                parent_id: Some("root".to_string()),
                parent_key: Some("items".to_string()),
                data: None,
            },
        ),
    ];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    let create_ops: Vec<_> = ops
        .iter()
        .filter(|op| op.op_code == OpCode::CreateList)
        .collect();
    assert_eq!(create_ops.len(), 1);
    assert_eq!(create_ops[0].id, "0:1");
}

#[test]
fn new_map_produces_create_map_op() {
    let current = vec![root_crdt()];
    let new_items = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Map,
                parent_id: Some("root".to_string()),
                parent_key: Some("settings".to_string()),
                data: None,
            },
        ),
    ];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    let create_ops: Vec<_> = ops
        .iter()
        .filter(|op| op.op_code == OpCode::CreateMap)
        .collect();
    assert_eq!(create_ops.len(), 1);
}

#[test]
fn new_register_produces_create_register_op() {
    let current = vec![root_crdt()];
    let new_items = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("root".to_string()),
                parent_key: Some("name".to_string()),
                data: Some(Json::String("Alice".to_string())),
            },
        ),
    ];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    let create_ops: Vec<_> = ops
        .iter()
        .filter(|op| op.op_code == OpCode::CreateRegister)
        .collect();
    assert_eq!(create_ops.len(), 1);
    assert_eq!(create_ops[0].data, Some(Json::String("Alice".to_string())));
}

// ---- Node removed ----

#[test]
fn removed_node_produces_delete_crdt_op() {
    let current = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: Some("root".to_string()),
                parent_key: Some("child".to_string()),
                data: Some(Json::Object(Default::default())),
            },
        ),
    ];
    let new_items = vec![root_crdt()];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    let delete_ops: Vec<_> = ops
        .iter()
        .filter(|op| op.op_code == OpCode::DeleteCrdt)
        .collect();
    assert_eq!(delete_ops.len(), 1);
    assert_eq!(delete_ops[0].id, "0:1");
}

// ---- Object data changed ----

#[test]
fn changed_object_data_produces_update_object_op() {
    let mut old_data = BTreeMap::new();
    old_data.insert("x".to_string(), Json::Number(1.0));
    let mut new_data = BTreeMap::new();
    new_data.insert("x".to_string(), Json::Number(2.0));

    let current = vec![root_crdt_with_data(old_data)];
    let new_items = vec![root_crdt_with_data(new_data)];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    let update_ops: Vec<_> = ops
        .iter()
        .filter(|op| op.op_code == OpCode::UpdateObject)
        .collect();
    assert_eq!(update_ops.len(), 1);
    assert_eq!(update_ops[0].id, "root");
    match &update_ops[0].data {
        Some(Json::Object(d)) => {
            assert_eq!(d.get("x"), Some(&Json::Number(2.0)));
        }
        _ => panic!("Expected Object data in UPDATE_OBJECT op"),
    }
}

// ---- Parent key changed ----

#[test]
fn changed_parent_key_produces_set_parent_key_op() {
    let current = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("root".to_string()),
                parent_key: Some("!".to_string()),
                data: Some(Json::Number(42.0)),
            },
        ),
    ];
    let new_items = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("root".to_string()),
                parent_key: Some("!0".to_string()),
                data: Some(Json::Number(42.0)),
            },
        ),
    ];
    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    let spk_ops: Vec<_> = ops
        .iter()
        .filter(|op| op.op_code == OpCode::SetParentKey)
        .collect();
    assert_eq!(spk_ops.len(), 1);
    assert_eq!(spk_ops[0].id, "0:1");
    assert_eq!(spk_ops[0].parent_key, Some("!0".to_string()));
}

// ---- Complex diff ----

#[test]
fn complex_diff_with_adds_removes_and_changes() {
    let mut old_data = BTreeMap::new();
    old_data.insert("x".to_string(), Json::Number(1.0));

    let current = vec![
        root_crdt_with_data(old_data),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: Some("root".to_string()),
                parent_key: Some("removed".to_string()),
                data: Some(Json::Object(Default::default())),
            },
        ),
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("root".to_string()),
                parent_key: Some("!".to_string()),
                data: Some(Json::Number(99.0)),
            },
        ),
    ];

    let mut new_data = BTreeMap::new();
    new_data.insert("x".to_string(), Json::Number(2.0));

    let new_items = vec![
        root_crdt_with_data(new_data),
        // 0:1 removed
        // 0:2 parent_key changed
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("root".to_string()),
                parent_key: Some("!0".to_string()),
                data: Some(Json::Number(99.0)),
            },
        ),
        // 0:3 added
        (
            "0:3".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Map,
                parent_id: Some("root".to_string()),
                parent_key: Some("new_map".to_string()),
                data: None,
            },
        ),
    ];

    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);

    // Should have: DELETE for 0:1, UPDATE_OBJECT for root, SET_PARENT_KEY for 0:2, CREATE_MAP for 0:3
    let delete_count = ops
        .iter()
        .filter(|o| o.op_code == OpCode::DeleteCrdt)
        .count();
    let update_count = ops
        .iter()
        .filter(|o| o.op_code == OpCode::UpdateObject)
        .count();
    let spk_count = ops
        .iter()
        .filter(|o| o.op_code == OpCode::SetParentKey)
        .count();
    let create_count = ops
        .iter()
        .filter(|o| o.op_code == OpCode::CreateMap)
        .count();

    assert!(
        delete_count >= 1,
        "Expected at least 1 DELETE, got: {:?}",
        ops
    );
    assert!(
        update_count >= 1,
        "Expected at least 1 UPDATE, got: {:?}",
        ops
    );
    assert!(
        spk_count >= 1,
        "Expected at least 1 SET_PARENT_KEY, got: {:?}",
        ops
    );
    assert!(
        create_count >= 1,
        "Expected at least 1 CREATE_MAP, got: {:?}",
        ops
    );
}

// ---- Deletes come before creates ----

#[test]
fn delete_ops_come_before_create_ops() {
    let current = vec![
        root_crdt(),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: Some("root".to_string()),
                parent_key: Some("old".to_string()),
                data: Some(Json::Object(Default::default())),
            },
        ),
    ];
    let new_items = vec![
        root_crdt(),
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: Some("root".to_string()),
                parent_key: Some("new".to_string()),
                data: Some(Json::Object(Default::default())),
            },
        ),
    ];

    let ops = tree_diff::get_trees_diff_operations(&current, &new_items);
    let delete_idx = ops.iter().position(|o| o.op_code == OpCode::DeleteCrdt);
    let create_idx = ops.iter().position(|o| o.op_code == OpCode::CreateObject);
    assert!(
        delete_idx.unwrap() < create_idx.unwrap(),
        "DELETE ops should come before CREATE ops"
    );
}
