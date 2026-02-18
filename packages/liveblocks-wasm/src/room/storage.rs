//! Storage lifecycle management.
//!
//! Handles the flow:
//! 1. FETCH_STORAGE sent to server
//! 2. STORAGE_STATE received — hydrate CRDT tree
//! 3. On reconnect: diff current tree against new STORAGE_STATE, replay unacked ops

use crate::document::Document;
use crate::ops::apply::apply_op;
use crate::snapshot;
use crate::tree_diff;
use crate::types::{ApplyResult, Op, OpSource, SerializedCrdt};

/// Type alias matching snapshot module's expected input.
pub type IdTuple = (String, SerializedCrdt);

/// Initialize a document from a STORAGE_STATE message.
///
/// Returns a new Document hydrated from the server items.
pub fn hydrate_storage(items: &[IdTuple]) -> Document {
    snapshot::deserialize(items)
}

/// On reconnect, diff the current document against a new server snapshot
/// and return the ops needed to bring the local document in sync.
pub fn diff_for_reconnect(
    current: &Document,
    new_items: &[IdTuple],
) -> Vec<Op> {
    let current_items = snapshot::serialize(current);
    tree_diff::get_trees_diff_operations(&current_items, new_items)
}

/// Replay unacked ops against the document after reconnection.
///
/// Each op is applied as a local operation. Returns the ops that were
/// successfully applied (for re-sending to the server).
pub fn replay_unacked_ops(
    document: &mut Document,
    unacked_ops: &[Op],
) -> Vec<Op> {
    let mut replayed = Vec::new();
    for op in unacked_ops {
        let result = apply_op(document, op, OpSource::Local);
        if matches!(result, ApplyResult::Modified { .. }) {
            replayed.push(op.clone());
        }
    }
    replayed
}
