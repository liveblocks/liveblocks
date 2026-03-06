use slotmap::{SlotMap, new_key_type};

new_key_type! {
    /// Key type for CRDT nodes in the generational arena.
    /// Provides O(1) lookup with generation-based safety against stale references.
    pub struct NodeKey;
}

/// Generational arena for CRDT node storage.
/// Wraps slotmap::SlotMap to provide safe, cache-friendly node allocation
/// with O(1) insert, remove, and lookup operations.
pub struct Arena<T> {
    inner: SlotMap<NodeKey, T>,
}

impl<T> Arena<T> {
    pub fn new() -> Self {
        Self {
            inner: SlotMap::with_key(),
        }
    }

    pub fn insert(&mut self, value: T) -> NodeKey {
        self.inner.insert(value)
    }

    pub fn get(&self, key: NodeKey) -> Option<&T> {
        self.inner.get(key)
    }

    pub fn get_mut(&mut self, key: NodeKey) -> Option<&mut T> {
        self.inner.get_mut(key)
    }

    pub fn remove(&mut self, key: NodeKey) -> Option<T> {
        self.inner.remove(key)
    }

    pub fn contains_key(&self, key: NodeKey) -> bool {
        self.inner.contains_key(key)
    }

    pub fn len(&self) -> usize {
        self.inner.len()
    }

    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    pub fn iter(&self) -> impl Iterator<Item = (NodeKey, &T)> {
        self.inner.iter()
    }

    pub fn iter_mut(&mut self) -> impl Iterator<Item = (NodeKey, &mut T)> {
        self.inner.iter_mut()
    }
}

impl<T> Default for Arena<T> {
    fn default() -> Self {
        Self::new()
    }
}
