/// ID generator for CRDT operations, matching the JS `generateId()` and
/// `generateOpId()` pattern in `createManagedPool`.
///
/// Two independent counters mirror the JS behavior where `generateId`
/// (for node IDs) and `generateOpId` (for operation IDs) have separate
/// counters.
pub struct IdGenerator {
    connection_id: i32,
    node_clock: u32,
    op_clock: u32,
}

impl IdGenerator {
    /// Create a new IdGenerator with the given connection ID.
    pub fn new(connection_id: i32) -> Self {
        Self {
            connection_id,
            node_clock: 0,
            op_clock: 0,
        }
    }

    /// Generate a new node ID: `"{connectionId}:{nodeCounter}"`.
    /// Increments the node counter.
    pub fn generate_id(&mut self) -> String {
        let id = format!("{}:{}", self.connection_id, self.node_clock);
        self.node_clock += 1;
        id
    }

    /// Generate a new operation ID: `"{connectionId}:{opCounter}"`.
    /// Increments the op counter.
    pub fn generate_op_id(&mut self) -> String {
        let id = format!("{}:{}", self.connection_id, self.op_clock);
        self.op_clock += 1;
        id
    }

    /// Update the connection ID (called on reconnect).
    pub fn set_connection_id(&mut self, id: i32) {
        self.connection_id = id;
    }

    /// Get the current connection ID.
    pub fn connection_id(&self) -> i32 {
        self.connection_id
    }

    /// Get the current node clock value.
    pub fn node_clock(&self) -> u32 {
        self.node_clock
    }

    /// Get the current op clock value.
    pub fn op_clock(&self) -> u32 {
        self.op_clock
    }

    /// Set the node clock value.
    pub fn set_node_clock(&mut self, value: u32) {
        self.node_clock = value;
    }

    /// Set the op clock value.
    pub fn set_op_clock(&mut self, value: u32) {
        self.op_clock = value;
    }
}

impl Default for IdGenerator {
    fn default() -> Self {
        Self::new(0)
    }
}
