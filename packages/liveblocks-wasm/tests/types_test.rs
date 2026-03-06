use liveblocks_wasm::types::{CrdtType, Json, OpCode, OpSource};

#[test]
fn opcode_has_correct_numeric_values() {
    assert_eq!(OpCode::Init as u8, 0);
    assert_eq!(OpCode::SetParentKey as u8, 1);
    assert_eq!(OpCode::CreateList as u8, 2);
    assert_eq!(OpCode::UpdateObject as u8, 3);
    assert_eq!(OpCode::CreateObject as u8, 4);
    assert_eq!(OpCode::DeleteCrdt as u8, 5);
    assert_eq!(OpCode::DeleteObjectKey as u8, 6);
    assert_eq!(OpCode::CreateMap as u8, 7);
    assert_eq!(OpCode::CreateRegister as u8, 8);
}

#[test]
fn opcode_has_nine_variants() {
    let all = [
        OpCode::Init,
        OpCode::SetParentKey,
        OpCode::CreateList,
        OpCode::UpdateObject,
        OpCode::CreateObject,
        OpCode::DeleteCrdt,
        OpCode::DeleteObjectKey,
        OpCode::CreateMap,
        OpCode::CreateRegister,
    ];
    assert_eq!(all.len(), 9);
}

#[test]
fn crdt_type_has_correct_numeric_values() {
    assert_eq!(CrdtType::Object as u8, 0);
    assert_eq!(CrdtType::List as u8, 1);
    assert_eq!(CrdtType::Map as u8, 2);
    assert_eq!(CrdtType::Register as u8, 3);
}

#[test]
fn crdt_type_has_four_variants() {
    let all = [
        CrdtType::Object,
        CrdtType::List,
        CrdtType::Map,
        CrdtType::Register,
    ];
    assert_eq!(all.len(), 4);
}

#[test]
fn op_source_has_three_variants() {
    let all = [OpSource::Local, OpSource::Theirs, OpSource::Ours];
    assert_eq!(all.len(), 3);
}

#[test]
fn json_null() {
    let v = Json::Null;
    assert!(matches!(v, Json::Null));
}

#[test]
fn json_bool() {
    let v = Json::Bool(true);
    assert!(matches!(v, Json::Bool(true)));
    let v = Json::Bool(false);
    assert!(matches!(v, Json::Bool(false)));
}

#[test]
fn json_number() {
    let v = Json::Number(42.0);
    if let Json::Number(n) = v {
        assert!((n - 42.0).abs() < f64::EPSILON);
    } else {
        panic!("Expected Json::Number");
    }
}

#[test]
fn json_string() {
    let v = Json::String("hello".to_string());
    if let Json::String(s) = v {
        assert_eq!(s, "hello");
    } else {
        panic!("Expected Json::String");
    }
}

#[test]
fn json_array() {
    let v = Json::Array(vec![Json::Null, Json::Bool(true), Json::Number(1.0)]);
    if let Json::Array(arr) = v {
        assert_eq!(arr.len(), 3);
    } else {
        panic!("Expected Json::Array");
    }
}

#[test]
fn json_object() {
    let mut map = std::collections::BTreeMap::new();
    map.insert("key".to_string(), Json::String("value".to_string()));
    let v = Json::Object(map);
    if let Json::Object(obj) = v {
        assert_eq!(obj.len(), 1);
        assert!(matches!(obj.get("key"), Some(Json::String(_))));
    } else {
        panic!("Expected Json::Object");
    }
}

#[test]
fn json_nested_structure() {
    let inner = Json::Array(vec![Json::Number(1.0), Json::Number(2.0)]);
    let mut map = std::collections::BTreeMap::new();
    map.insert("items".to_string(), inner);
    map.insert("count".to_string(), Json::Number(2.0));
    let v = Json::Object(map);
    if let Json::Object(obj) = v {
        assert_eq!(obj.len(), 2);
    } else {
        panic!("Expected Json::Object");
    }
}

#[test]
fn opcode_serde_round_trip() {
    for code in [
        OpCode::Init,
        OpCode::SetParentKey,
        OpCode::CreateList,
        OpCode::UpdateObject,
        OpCode::CreateObject,
        OpCode::DeleteCrdt,
        OpCode::DeleteObjectKey,
        OpCode::CreateMap,
        OpCode::CreateRegister,
    ] {
        let serialized = serde_json::to_string(&code).unwrap();
        let deserialized: OpCode = serde_json::from_str(&serialized).unwrap();
        assert_eq!(code, deserialized);
    }
}

#[test]
fn crdt_type_serde_round_trip() {
    for ct in [
        CrdtType::Object,
        CrdtType::List,
        CrdtType::Map,
        CrdtType::Register,
    ] {
        let serialized = serde_json::to_string(&ct).unwrap();
        let deserialized: CrdtType = serde_json::from_str(&serialized).unwrap();
        assert_eq!(ct, deserialized);
    }
}

#[test]
fn json_serde_round_trip() {
    let values = vec![
        Json::Null,
        Json::Bool(true),
        Json::Bool(false),
        Json::Number(3.125),
        Json::String("test".to_string()),
        Json::Array(vec![Json::Null, Json::Number(1.0)]),
        {
            let mut map = std::collections::BTreeMap::new();
            map.insert("a".to_string(), Json::Bool(true));
            Json::Object(map)
        },
    ];
    for val in values {
        let serialized = serde_json::to_string(&val).unwrap();
        let deserialized: Json = serde_json::from_str(&serialized).unwrap();
        assert_eq!(val, deserialized);
    }
}

#[test]
fn opcode_deserializes_from_integer() {
    // Wire format uses integers
    let code: OpCode = serde_json::from_str("0").unwrap();
    assert_eq!(code, OpCode::Init);
    let code: OpCode = serde_json::from_str("5").unwrap();
    assert_eq!(code, OpCode::DeleteCrdt);
    let code: OpCode = serde_json::from_str("8").unwrap();
    assert_eq!(code, OpCode::CreateRegister);
}

#[test]
fn crdt_type_deserializes_from_integer() {
    let ct: CrdtType = serde_json::from_str("0").unwrap();
    assert_eq!(ct, CrdtType::Object);
    let ct: CrdtType = serde_json::from_str("3").unwrap();
    assert_eq!(ct, CrdtType::Register);
}
