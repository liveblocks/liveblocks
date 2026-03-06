use liveblocks_wasm::crdt::node::CrdtData;
use liveblocks_wasm::crdt::object;
use liveblocks_wasm::snapshot;
use liveblocks_wasm::types::{CrdtType, Json, SerializedCrdt};

// ---- Deserialization ----

#[test]
fn deserialize_root_only() {
    let items = vec![(
        "root".to_string(),
        SerializedCrdt {
            crdt_type: CrdtType::Object,
            parent_id: None,
            parent_key: None,
            data: Some(Json::Object(Default::default())),
        },
    )];

    let doc = snapshot::deserialize(&items);
    assert!(doc.root_key().is_some());
    let root = doc.root().unwrap();
    assert_eq!(root.id, "root");
    assert_eq!(root.node_type, CrdtType::Object);
    assert!(root.parent_id.is_none());
}

#[test]
fn deserialize_root_with_data() {
    let mut data = std::collections::BTreeMap::new();
    data.insert("x".to_string(), Json::Number(1.0));
    data.insert("y".to_string(), Json::Number(2.0));

    let items = vec![(
        "root".to_string(),
        SerializedCrdt {
            crdt_type: CrdtType::Object,
            parent_id: None,
            parent_key: None,
            data: Some(Json::Object(data)),
        },
    )];

    let doc = snapshot::deserialize(&items);
    let root_key = doc.root_key().unwrap();
    assert_eq!(
        object::get_plain(&doc, root_key, "x"),
        Some(&Json::Number(1.0))
    );
    assert_eq!(
        object::get_plain(&doc, root_key, "y"),
        Some(&Json::Number(2.0))
    );
}

#[test]
fn deserialize_nested_object() {
    let items = vec![
        (
            "root".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: None,
                parent_key: None,
                data: Some(Json::Object(Default::default())),
            },
        ),
        (
            "0:0".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: Some("root".to_string()),
                parent_key: Some("child".to_string()),
                data: Some(Json::Object({
                    let mut m = std::collections::BTreeMap::new();
                    m.insert("inner".to_string(), Json::Number(42.0));
                    m
                })),
            },
        ),
    ];

    let doc = snapshot::deserialize(&items);
    let root_key = doc.root_key().unwrap();

    // Root should have a child at "child"
    let root = doc.get_node(root_key).unwrap();
    match &root.data {
        CrdtData::Object { children, .. } => {
            assert!(children.contains_key("child"));
        }
        _ => panic!("Root should be Object"),
    }
}

#[test]
fn deserialize_list_with_registers() {
    let items = vec![
        (
            "root".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: None,
                parent_key: None,
                data: Some(Json::Object(Default::default())),
            },
        ),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::List,
                parent_id: Some("root".to_string()),
                parent_key: Some("items".to_string()),
                data: None,
            },
        ),
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("0:1".to_string()),
                parent_key: Some("!".to_string()),
                data: Some(Json::String("a".to_string())),
            },
        ),
        (
            "0:3".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("0:1".to_string()),
                parent_key: Some("!0".to_string()),
                data: Some(Json::String("b".to_string())),
            },
        ),
    ];

    let doc = snapshot::deserialize(&items);
    let list_key = doc.get_key_by_id("0:1").unwrap();
    let list_node = doc.get_node(list_key).unwrap();
    match &list_node.data {
        CrdtData::List { children, .. } => {
            assert_eq!(children.len(), 2);
            // Should be sorted by position: "!" < "!0"
            assert_eq!(children[0].0, "!");
            assert_eq!(children[1].0, "!0");
        }
        _ => panic!("Expected List"),
    }
}

#[test]
fn deserialize_map_with_registers() {
    let items = vec![
        (
            "root".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: None,
                parent_key: None,
                data: Some(Json::Object(Default::default())),
            },
        ),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Map,
                parent_id: Some("root".to_string()),
                parent_key: Some("settings".to_string()),
                data: None,
            },
        ),
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("0:1".to_string()),
                parent_key: Some("color".to_string()),
                data: Some(Json::String("red".to_string())),
            },
        ),
    ];

    let doc = snapshot::deserialize(&items);
    let map_key = doc.get_key_by_id("0:1").unwrap();
    let map_node = doc.get_node(map_key).unwrap();
    match &map_node.data {
        CrdtData::Map { children, .. } => {
            assert_eq!(children.len(), 1);
            assert!(children.contains_key("color"));
        }
        _ => panic!("Expected Map"),
    }
}

#[test]
fn deserialize_items_in_any_order() {
    // Items can appear in any order — children before parents
    let items = vec![
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("0:1".to_string()),
                parent_key: Some("first".to_string()),
                data: Some(Json::String("hello".to_string())),
            },
        ),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Map,
                parent_id: Some("root".to_string()),
                parent_key: Some("map".to_string()),
                data: None,
            },
        ),
        (
            "root".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: None,
                parent_key: None,
                data: Some(Json::Object(Default::default())),
            },
        ),
    ];

    let doc = snapshot::deserialize(&items);
    assert!(doc.root_key().is_some());
    assert!(doc.get_key_by_id("0:1").is_some());
    assert!(doc.get_key_by_id("0:2").is_some());
}

// ---- Serialization ----

#[test]
fn serialize_round_trip_root_only() {
    let items_in = vec![(
        "root".to_string(),
        SerializedCrdt {
            crdt_type: CrdtType::Object,
            parent_id: None,
            parent_key: None,
            data: Some(Json::Object(Default::default())),
        },
    )];

    let doc = snapshot::deserialize(&items_in);
    let items_out = snapshot::serialize(&doc);

    assert_eq!(items_out.len(), 1);
    assert_eq!(items_out[0].0, "root");
    assert_eq!(items_out[0].1.crdt_type, CrdtType::Object);
    assert!(items_out[0].1.parent_id.is_none());
}

#[test]
fn serialize_round_trip_nested() {
    let mut data = std::collections::BTreeMap::new();
    data.insert("x".to_string(), Json::Number(1.0));

    let items_in = vec![
        (
            "root".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: None,
                parent_key: None,
                data: Some(Json::Object(data)),
            },
        ),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::List,
                parent_id: Some("root".to_string()),
                parent_key: Some("items".to_string()),
                data: None,
            },
        ),
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("0:1".to_string()),
                parent_key: Some("!".to_string()),
                data: Some(Json::Number(42.0)),
            },
        ),
    ];

    let doc = snapshot::deserialize(&items_in);
    let items_out = snapshot::serialize(&doc);

    // Should have root + root:x register + list + list item register = 4 items
    // root object has "x" as inline data, so "root:x" register is present
    assert!(items_out.len() >= 3);

    // Check list exists in output
    let list_items: Vec<_> = items_out
        .iter()
        .filter(|(_, s)| s.crdt_type == CrdtType::List)
        .collect();
    assert_eq!(list_items.len(), 1);

    // Check register exists in output
    let reg_items: Vec<_> = items_out
        .iter()
        .filter(|(_, s)| s.crdt_type == CrdtType::Register)
        .collect();
    assert!(!reg_items.is_empty());
}

#[test]
fn serialize_preserves_all_node_ids() {
    let items_in = vec![
        (
            "root".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Object,
                parent_id: None,
                parent_key: None,
                data: Some(Json::Object(Default::default())),
            },
        ),
        (
            "0:1".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Map,
                parent_id: Some("root".to_string()),
                parent_key: Some("map".to_string()),
                data: None,
            },
        ),
        (
            "0:2".to_string(),
            SerializedCrdt {
                crdt_type: CrdtType::Register,
                parent_id: Some("0:1".to_string()),
                parent_key: Some("key".to_string()),
                data: Some(Json::String("val".to_string())),
            },
        ),
    ];

    let doc = snapshot::deserialize(&items_in);
    let items_out = snapshot::serialize(&doc);

    let ids: Vec<&str> = items_out.iter().map(|(id, _)| id.as_str()).collect();
    assert!(ids.contains(&"root"));
    assert!(ids.contains(&"0:1"));
    assert!(ids.contains(&"0:2"));
}
