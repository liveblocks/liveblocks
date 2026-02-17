use liveblocks_wasm::arena::Arena;

#[test]
fn insert_and_get() {
    let mut arena = Arena::new();
    let key = arena.insert("hello".to_string());
    assert_eq!(arena.get(key), Some(&"hello".to_string()));
}

#[test]
fn insert_multiple_and_get() {
    let mut arena = Arena::new();
    let k1 = arena.insert("first".to_string());
    let k2 = arena.insert("second".to_string());
    let k3 = arena.insert("third".to_string());
    assert_eq!(arena.get(k1), Some(&"first".to_string()));
    assert_eq!(arena.get(k2), Some(&"second".to_string()));
    assert_eq!(arena.get(k3), Some(&"third".to_string()));
}

#[test]
fn remove_returns_value() {
    let mut arena = Arena::new();
    let key = arena.insert("hello".to_string());
    let removed = arena.remove(key);
    assert_eq!(removed, Some("hello".to_string()));
}

#[test]
fn get_after_remove_returns_none() {
    let mut arena = Arena::new();
    let key = arena.insert("hello".to_string());
    arena.remove(key);
    assert_eq!(arena.get(key), None);
}

#[test]
fn generation_check_prevents_stale_access() {
    let mut arena = Arena::new();
    let old_key = arena.insert("first".to_string());
    arena.remove(old_key);
    // Insert something new, which may reuse the same slot
    let _new_key = arena.insert("second".to_string());
    // Old key should NOT access the new data (generation mismatch)
    assert_eq!(arena.get(old_key), None);
}

#[test]
fn get_mut_works() {
    let mut arena = Arena::new();
    let key = arena.insert("original".to_string());
    if let Some(val) = arena.get_mut(key) {
        *val = "modified".to_string();
    }
    assert_eq!(arena.get(key), Some(&"modified".to_string()));
}

#[test]
fn len_tracks_insertions_and_removals() {
    let mut arena = Arena::new();
    assert_eq!(arena.len(), 0);
    assert!(arena.is_empty());

    let k1 = arena.insert("a".to_string());
    assert_eq!(arena.len(), 1);

    let _k2 = arena.insert("b".to_string());
    assert_eq!(arena.len(), 2);

    arena.remove(k1);
    assert_eq!(arena.len(), 1);
    assert!(!arena.is_empty());
}

#[test]
fn iteration_yields_all_items() {
    let mut arena = Arena::new();
    let _k1 = arena.insert("a".to_string());
    let _k2 = arena.insert("b".to_string());
    let _k3 = arena.insert("c".to_string());

    let mut values: Vec<String> = arena.iter().map(|(_, v)| v.clone()).collect();
    values.sort();
    assert_eq!(values, vec!["a", "b", "c"]);
}

#[test]
fn iteration_skips_removed_items() {
    let mut arena = Arena::new();
    let _k1 = arena.insert("a".to_string());
    let k2 = arena.insert("b".to_string());
    let _k3 = arena.insert("c".to_string());

    arena.remove(k2);

    let mut values: Vec<String> = arena.iter().map(|(_, v)| v.clone()).collect();
    values.sort();
    assert_eq!(values, vec!["a", "c"]);
}

#[test]
fn contains_key() {
    let mut arena = Arena::new();
    let key = arena.insert("hello".to_string());
    assert!(arena.contains_key(key));
    arena.remove(key);
    assert!(!arena.contains_key(key));
}

#[test]
fn remove_nonexistent_returns_none() {
    let mut arena = Arena::new();
    let key = arena.insert("hello".to_string());
    arena.remove(key);
    // Second remove should return None
    assert_eq!(arena.remove(key), None);
}
