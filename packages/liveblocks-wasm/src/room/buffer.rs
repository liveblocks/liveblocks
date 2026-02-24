//! Outbound message buffer.
//!
//! Collects all pending outbound messages (presence updates, storage ops,
//! broadcast events) and flushes them as a single JSON array text frame.

use crate::protocol::client_msg::ClientMsg;

/// Outbound message buffer.
#[derive(Debug, Default)]
pub struct OutboundBuffer {
    messages: Vec<ClientMsg>,
}

impl OutboundBuffer {
    pub fn new() -> Self {
        Self::default()
    }

    /// Push a message to the buffer.
    pub fn push(&mut self, msg: ClientMsg) {
        self.messages.push(msg);
    }

    /// Push a message to the front of the buffer.
    pub fn push_front(&mut self, msg: ClientMsg) {
        self.messages.insert(0, msg);
    }

    /// Is the buffer empty?
    pub fn is_empty(&self) -> bool {
        self.messages.is_empty()
    }

    /// Drain all messages from the buffer.
    pub fn drain(&mut self) -> Vec<ClientMsg> {
        std::mem::take(&mut self.messages)
    }

    /// Number of pending messages.
    pub fn len(&self) -> usize {
        self.messages.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_buffer_push_and_drain() {
        let mut buf = OutboundBuffer::new();
        assert!(buf.is_empty());

        buf.push(ClientMsg::FetchStorage {});
        assert!(!buf.is_empty());
        assert_eq!(buf.len(), 1);

        let msgs = buf.drain();
        assert_eq!(msgs.len(), 1);
        assert!(buf.is_empty());
    }

    #[test]
    fn test_buffer_drain_returns_in_order() {
        let mut buf = OutboundBuffer::new();
        buf.push(ClientMsg::FetchStorage {});
        buf.push(ClientMsg::BroadcastEvent {
            event: json!({"type": "test"}),
        });

        let msgs = buf.drain();
        assert_eq!(msgs.len(), 2);
        assert!(matches!(msgs[0], ClientMsg::FetchStorage {}));
        assert!(matches!(msgs[1], ClientMsg::BroadcastEvent { .. }));
    }
}
