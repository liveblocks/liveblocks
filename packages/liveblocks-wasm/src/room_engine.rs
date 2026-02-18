//! Room Storage Engine — owns undo/redo stacks, unacked ops, batch state,
//! history pause/resume, and storage-status classification.
//!
//! The engine is a "consulted data store": JS calls it with batch operations
//! and receives structured responses. No fine-grained per-op boundary crossings.

use std::collections::VecDeque;

use indexmap::IndexMap;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::types::Op;

/// Serialize a value to JsValue using json-compatible mode (plain objects, not Maps).
#[cfg(feature = "wasm")]
fn to_js<T: Serialize>(value: &T) -> Result<JsValue, serde_wasm_bindgen::Error> {
    value.serialize(&serde_wasm_bindgen::Serializer::json_compatible())
}

// ---------------------------------------------------------------------------
// Stackframe — mirrors the TS union `Op | { type: "presence", data: P }`
// ---------------------------------------------------------------------------

/// A single frame on the undo/redo stack.
///
/// TS distinguishes `Op` (has `type: number`) from `PresenceStackframe`
/// (has `type: "presence"`).  Our custom serde produces the same shape:
/// - `StorageOp(op)` → serializes as the Op itself (with `type` as OpCode integer)
/// - `Presence(data)` → serializes as `{ type: "presence", data: {...} }`
#[derive(Debug, Clone, PartialEq)]
pub enum Stackframe {
    StorageOp(Op),
    Presence(JsonValue),
}

// -- Custom Serialize / Deserialize so the JSON shape matches TS exactly ------

impl Serialize for Stackframe {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Stackframe::StorageOp(op) => op.serialize(serializer),
            Stackframe::Presence(data) => {
                use serde::ser::SerializeMap;
                let mut map = serializer.serialize_map(Some(2))?;
                map.serialize_entry("type", "presence")?;
                map.serialize_entry("data", data)?;
                map.end()
            }
        }
    }
}

impl<'de> Deserialize<'de> for Stackframe {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // Deserialize into a generic JSON value first, then inspect "type".
        let value = JsonValue::deserialize(deserializer)?;

        if let Some(obj) = value.as_object() {
            if let Some(type_val) = obj.get("type") {
                if type_val == "presence" {
                    let data = obj
                        .get("data")
                        .cloned()
                        .unwrap_or(JsonValue::Object(serde_json::Map::new()));
                    return Ok(Stackframe::Presence(data));
                }
            }
        }

        // Not a presence frame → parse as Op
        let op: Op =
            serde_json::from_value(value).map_err(serde::de::Error::custom)?;
        Ok(Stackframe::StorageOp(op))
    }
}

// ---------------------------------------------------------------------------
// BatchState
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct BatchState {
    ops: Vec<Op>,
    reverse_ops: VecDeque<Stackframe>,
}

// ---------------------------------------------------------------------------
// OpSource result
// ---------------------------------------------------------------------------

/// Classification of a remote op.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpSourceResult {
    Ours,
    Theirs,
}

// ---------------------------------------------------------------------------
// RoomStorageEngine — pure Rust, no wasm_bindgen
// ---------------------------------------------------------------------------

/// Max undo stack depth (matches the TS constant).
const MAX_UNDO_STACK: usize = 50;

#[derive(Debug)]
pub struct RoomStorageEngine {
    undo_stack: Vec<Vec<Stackframe>>,
    redo_stack: Vec<Vec<Stackframe>>,
    paused_history: Option<VecDeque<Stackframe>>,
    unacked_ops: IndexMap<String, Op>,
    active_batch: Option<BatchState>,
}

impl RoomStorageEngine {
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            paused_history: None,
            unacked_ops: IndexMap::new(),
            active_batch: None,
        }
    }

    // -- Undo/redo ----------------------------------------------------------

    /// Push frames to the real undo stack (capped at 50).
    fn push_to_real_undo_stack(&mut self, frames: Vec<Stackframe>) {
        if self.undo_stack.len() >= MAX_UNDO_STACK {
            self.undo_stack.remove(0);
        }
        self.undo_stack.push(frames);
    }

    /// Add frames to the undo stack, respecting `paused_history`.
    pub fn add_to_undo_stack(&mut self, frames: Vec<Stackframe>) {
        if let Some(ref mut paused) = self.paused_history {
            // Prepend (pushLeft semantics): newest reverse ops go first
            for frame in frames.into_iter().rev() {
                paused.push_front(frame);
            }
        } else {
            self.push_to_real_undo_stack(frames);
        }
    }

    /// Pop the top of the undo stack. Returns `None` if empty.
    /// Also clears `paused_history`.
    pub fn undo(&mut self) -> Option<Vec<Stackframe>> {
        let frames = self.undo_stack.pop()?;
        self.paused_history = None;
        Some(frames)
    }

    /// Pop the top of the redo stack. Returns `None` if empty.
    /// Also clears `paused_history`.
    pub fn redo(&mut self) -> Option<Vec<Stackframe>> {
        let frames = self.redo_stack.pop()?;
        self.paused_history = None;
        Some(frames)
    }

    /// Push reverse frames onto the redo stack (after undo completes).
    pub fn push_to_redo(&mut self, frames: Vec<Stackframe>) {
        self.redo_stack.push(frames);
    }

    /// Push reverse frames onto the undo stack (after redo completes).
    pub fn push_to_undo_after_redo(&mut self, frames: Vec<Stackframe>) {
        self.undo_stack.push(frames);
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    pub fn clear_history(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }

    /// Save the current undo stack length as a checkpoint.
    pub fn save_undo_checkpoint(&self) -> usize {
        self.undo_stack.len()
    }

    /// Restore undo stack to a previous checkpoint (truncate to length).
    pub fn restore_undo_checkpoint(&mut self, checkpoint: usize) {
        self.undo_stack.truncate(checkpoint);
    }

    pub fn undo_stack_length(&self) -> usize {
        self.undo_stack.len()
    }

    pub fn redo_stack_length(&self) -> usize {
        self.redo_stack.len()
    }

    // -- History pause/resume -----------------------------------------------

    pub fn pause_history(&mut self) {
        if self.paused_history.is_none() {
            self.paused_history = Some(VecDeque::new());
        }
    }

    /// Resume history: commit all paused frames as a single undo stack entry.
    pub fn resume_history(&mut self) {
        if let Some(frames) = self.paused_history.take() {
            if !frames.is_empty() {
                let vec: Vec<Stackframe> = frames.into_iter().collect();
                self.push_to_real_undo_stack(vec);
            }
        }
    }

    // -- Unacked ops --------------------------------------------------------

    pub fn track_unacked_op(&mut self, op_id: String, op: Op) {
        self.unacked_ops.insert(op_id, op);
    }

    /// Classify a remote op: if its opId is in our unacked set, it's OURS
    /// (and we remove it); otherwise it's THEIRS.
    pub fn classify_remote_op(&mut self, op: &Op) -> OpSourceResult {
        if let Some(ref op_id) = op.op_id {
            if self.unacked_ops.shift_remove(op_id).is_some() {
                return OpSourceResult::Ours;
            }
        }
        OpSourceResult::Theirs
    }

    pub fn has_unacked_ops(&self) -> bool {
        !self.unacked_ops.is_empty()
    }

    pub fn get_unacked_ops(&self) -> &IndexMap<String, Op> {
        &self.unacked_ops
    }

    pub fn clear_unacked_ops(&mut self) {
        self.unacked_ops.clear();
    }

    // -- Batch --------------------------------------------------------------

    pub fn is_batching(&self) -> bool {
        self.active_batch.is_some()
    }

    pub fn start_batch(&mut self) {
        self.active_batch = Some(BatchState {
            ops: Vec::new(),
            reverse_ops: VecDeque::new(),
        });
    }

    pub fn batch_add_ops(&mut self, ops: Vec<Op>) {
        if let Some(ref mut batch) = self.active_batch {
            batch.ops.extend(ops);
        }
    }

    /// Add reverse frames to the batch with pushLeft (prepend) semantics.
    pub fn batch_add_reverse(&mut self, frames: Vec<Stackframe>) {
        if let Some(ref mut batch) = self.active_batch {
            for frame in frames.into_iter().rev() {
                batch.reverse_ops.push_front(frame);
            }
        }
    }

    /// End the current batch. Returns `(ops, reverse_frames)` if the batch
    /// had any content, or `None` if there was no active batch.
    /// Clears the redo stack if any ops were produced.
    pub fn end_batch(&mut self) -> Option<(Vec<Op>, Vec<Stackframe>)> {
        let batch = self.active_batch.take()?;
        if !batch.ops.is_empty() {
            self.redo_stack.clear();
        }
        let reverse: Vec<Stackframe> = batch.reverse_ops.into_iter().collect();
        Some((batch.ops, reverse))
    }

    // -- Storage status -----------------------------------------------------

    /// Compute the storage sync status string.
    pub fn storage_sync_status(&self, root_loaded: bool, requested: bool) -> &str {
        if !root_loaded {
            if !requested {
                "not-loaded"
            } else {
                "loading"
            }
        } else if self.unacked_ops.is_empty() {
            "synchronized"
        } else {
            "synchronizing"
        }
    }

    // -- Composite operations for wasm_bindgen handle -----------------------

    /// Called from JS `onDispatch` when NOT batching.
    /// Adds reverse ops to the undo stack and clears the redo stack.
    pub fn on_dispatch_outside_batch(&mut self, reverse: Vec<Stackframe>) {
        self.add_to_undo_stack(reverse);
        self.redo_stack.clear();
    }

    /// Called from JS `onDispatch` when batching.
    /// Accumulates ops and reverse frames into the active batch.
    pub fn batch_accumulate(&mut self, ops: Vec<Op>, reverse: Vec<Stackframe>) {
        self.batch_add_ops(ops);
        self.batch_add_reverse(reverse);
    }
}

impl Default for RoomStorageEngine {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// wasm_bindgen handle
// ---------------------------------------------------------------------------

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct RoomStorageEngineHandle {
    engine: RoomStorageEngine,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl RoomStorageEngineHandle {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            engine: RoomStorageEngine::new(),
        }
    }

    // -- onDispatch helpers -------------------------------------------------

    /// Add reverse ops to undo stack and clear redo (non-batch path).
    #[wasm_bindgen(js_name = "onDispatchOutsideBatch")]
    pub fn on_dispatch_outside_batch(&mut self, reverse_js: JsValue) -> Result<(), JsError> {
        let reverse: Vec<Stackframe> = serde_wasm_bindgen::from_value(reverse_js)?;
        self.engine.on_dispatch_outside_batch(reverse);
        Ok(())
    }

    /// Accumulate ops and reverse ops into active batch.
    #[wasm_bindgen(js_name = "batchAccumulate")]
    pub fn batch_accumulate(
        &mut self,
        ops_js: JsValue,
        reverse_js: JsValue,
    ) -> Result<(), JsError> {
        let ops: Vec<Op> = serde_wasm_bindgen::from_value(ops_js)?;
        let reverse: Vec<Stackframe> = serde_wasm_bindgen::from_value(reverse_js)?;
        self.engine.batch_accumulate(ops, reverse);
        Ok(())
    }

    /// Add frames to undo stack, respecting paused history.
    #[wasm_bindgen(js_name = "addToUndoStack")]
    pub fn add_to_undo_stack(&mut self, frames_js: JsValue) -> Result<(), JsError> {
        let frames: Vec<Stackframe> = serde_wasm_bindgen::from_value(frames_js)?;
        self.engine.add_to_undo_stack(frames);
        Ok(())
    }

    /// Clear the redo stack.
    #[wasm_bindgen(js_name = "clearRedoStack")]
    pub fn clear_redo_stack(&mut self) {
        self.engine.redo_stack.clear();
    }

    // -- Undo/redo ----------------------------------------------------------

    /// Pop the undo stack. Returns the frames as JsValue, or undefined if empty.
    #[wasm_bindgen]
    pub fn undo(&mut self) -> Result<JsValue, JsError> {
        match self.engine.undo() {
            Some(frames) => Ok(to_js(&frames)?),
            None => Ok(JsValue::UNDEFINED),
        }
    }

    /// Pop the redo stack. Returns the frames as JsValue, or undefined if empty.
    #[wasm_bindgen]
    pub fn redo(&mut self) -> Result<JsValue, JsError> {
        match self.engine.redo() {
            Some(frames) => Ok(to_js(&frames)?),
            None => Ok(JsValue::UNDEFINED),
        }
    }

    /// Push frames onto the redo stack (after undo completes).
    #[wasm_bindgen(js_name = "pushRedo")]
    pub fn push_redo(&mut self, frames_js: JsValue) -> Result<(), JsError> {
        let frames: Vec<Stackframe> = serde_wasm_bindgen::from_value(frames_js)?;
        self.engine.push_to_redo(frames);
        Ok(())
    }

    /// Push frames onto the undo stack (after redo completes).
    #[wasm_bindgen(js_name = "pushUndo")]
    pub fn push_undo(&mut self, frames_js: JsValue) -> Result<(), JsError> {
        let frames: Vec<Stackframe> = serde_wasm_bindgen::from_value(frames_js)?;
        self.engine.push_to_undo_after_redo(frames);
        Ok(())
    }

    #[wasm_bindgen(js_name = "canUndo")]
    pub fn can_undo(&self) -> bool {
        self.engine.can_undo()
    }

    #[wasm_bindgen(js_name = "canRedo")]
    pub fn can_redo(&self) -> bool {
        self.engine.can_redo()
    }

    #[wasm_bindgen(js_name = "clearHistory")]
    pub fn clear_history(&mut self) {
        self.engine.clear_history();
    }

    #[wasm_bindgen(js_name = "saveUndoCheckpoint")]
    pub fn save_undo_checkpoint(&self) -> usize {
        self.engine.save_undo_checkpoint()
    }

    #[wasm_bindgen(js_name = "restoreUndoCheckpoint")]
    pub fn restore_undo_checkpoint(&mut self, checkpoint: usize) {
        self.engine.restore_undo_checkpoint(checkpoint);
    }

    // -- History pause/resume -----------------------------------------------

    #[wasm_bindgen(js_name = "pauseHistory")]
    pub fn pause_history(&mut self) {
        self.engine.pause_history();
    }

    #[wasm_bindgen(js_name = "resumeHistory")]
    pub fn resume_history(&mut self) {
        self.engine.resume_history();
    }

    // -- Batch --------------------------------------------------------------

    #[wasm_bindgen(js_name = "isBatching")]
    pub fn is_batching(&self) -> bool {
        self.engine.is_batching()
    }

    #[wasm_bindgen(js_name = "startBatch")]
    pub fn start_batch(&mut self) {
        self.engine.start_batch();
    }

    /// End the batch. Returns `{ ops, reverse, hadOps }` or undefined if no batch.
    #[wasm_bindgen(js_name = "endBatch")]
    pub fn end_batch(&mut self) -> Result<JsValue, JsError> {
        match self.engine.end_batch() {
            Some((ops, reverse)) => {
                let had_ops = !ops.is_empty();
                #[derive(Serialize)]
                struct BatchResult {
                    ops: Vec<Op>,
                    reverse: Vec<Stackframe>,
                    #[serde(rename = "hadOps")]
                    had_ops: bool,
                }
                Ok(to_js(&BatchResult { ops, reverse, had_ops })?)
            }
            None => Ok(JsValue::UNDEFINED),
        }
    }

    // -- Unacked ops --------------------------------------------------------

    #[wasm_bindgen(js_name = "trackUnackedOp")]
    pub fn track_unacked_op(&mut self, op_id: String, op_js: JsValue) -> Result<(), JsError> {
        let op: Op = serde_wasm_bindgen::from_value(op_js)?;
        self.engine.track_unacked_op(op_id, op);
        Ok(())
    }

    /// Classify a remote op. Returns `"ours"` or `"theirs"`.
    #[wasm_bindgen(js_name = "classifyRemoteOp")]
    pub fn classify_remote_op(&mut self, op_js: JsValue) -> Result<String, JsError> {
        let op: Op = serde_wasm_bindgen::from_value(op_js)?;
        match self.engine.classify_remote_op(&op) {
            OpSourceResult::Ours => Ok("ours".to_string()),
            OpSourceResult::Theirs => Ok("theirs".to_string()),
        }
    }

    #[wasm_bindgen(js_name = "hasUnackedOps")]
    pub fn has_unacked_ops(&self) -> bool {
        self.engine.has_unacked_ops()
    }

    /// Returns the unacked ops as an array of ops (values only, not the map).
    #[wasm_bindgen(js_name = "getUnackedOps")]
    pub fn get_unacked_ops(&self) -> Result<JsValue, JsError> {
        let ops: Vec<&Op> = self.engine.get_unacked_ops().values().collect();
        Ok(to_js(&ops)?)
    }

    // -- Storage status -----------------------------------------------------

    /// Returns `"not-loaded"`, `"loading"`, `"synchronized"`, or `"synchronizing"`.
    #[wasm_bindgen(js_name = "storageSyncStatus")]
    pub fn storage_sync_status(&self, root_loaded: bool, requested: bool) -> String {
        self.engine
            .storage_sync_status(root_loaded, requested)
            .to_string()
    }

    // -- DevTools getters ---------------------------------------------------

    #[wasm_bindgen(getter, js_name = "undoStackLength")]
    pub fn undo_stack_length(&self) -> usize {
        self.engine.undo_stack_length()
    }

    #[wasm_bindgen(getter, js_name = "redoStackLength")]
    pub fn redo_stack_length(&self) -> usize {
        self.engine.redo_stack_length()
    }

    /// Return the full undo stack as JsValue (for DevTools introspection).
    #[wasm_bindgen(js_name = "getUndoStack")]
    pub fn get_undo_stack(&self) -> Result<JsValue, JsError> {
        Ok(to_js(&self.engine.undo_stack)?)
    }
}

#[cfg(feature = "wasm")]
impl Default for RoomStorageEngineHandle {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::OpCode;

    fn make_op(id: &str, op_code: OpCode, op_id: Option<&str>) -> Op {
        Op {
            op_code,
            id: id.to_string(),
            op_id: op_id.map(|s| s.to_string()),
            parent_id: None,
            parent_key: None,
            data: None,
            intent: None,
            deleted_id: None,
            key: None,
        }
    }

    fn make_storage_frame(id: &str, op_code: OpCode) -> Stackframe {
        Stackframe::StorageOp(make_op(id, op_code, None))
    }

    fn make_presence_frame(data: JsonValue) -> Stackframe {
        Stackframe::Presence(data)
    }

    // -- Undo stack tests ---------------------------------------------------

    #[test]
    fn test_add_to_undo_stack_and_pop() {
        let mut engine = RoomStorageEngine::new();
        let frames = vec![make_storage_frame("1", OpCode::UpdateObject)];
        engine.add_to_undo_stack(frames.clone());
        assert!(engine.can_undo());
        assert!(!engine.can_redo());

        let popped = engine.undo().unwrap();
        assert_eq!(popped.len(), 1);
        assert!(!engine.can_undo());
    }

    #[test]
    fn test_undo_stack_cap_at_50() {
        let mut engine = RoomStorageEngine::new();
        for i in 0..60 {
            engine.add_to_undo_stack(vec![make_storage_frame(
                &i.to_string(),
                OpCode::UpdateObject,
            )]);
        }
        assert_eq!(engine.undo_stack.len(), 50);
        // The oldest (0-9) should have been shifted off; the top should be 59
        let top = engine.undo().unwrap();
        if let Stackframe::StorageOp(op) = &top[0] {
            assert_eq!(op.id, "59");
        } else {
            panic!("Expected StorageOp");
        }
    }

    #[test]
    fn test_undo_clears_paused_history() {
        let mut engine = RoomStorageEngine::new();
        engine.add_to_undo_stack(vec![make_storage_frame("1", OpCode::UpdateObject)]);
        engine.pause_history();
        assert!(engine.paused_history.is_some());
        engine.undo();
        assert!(engine.paused_history.is_none());
    }

    // -- Redo stack tests ---------------------------------------------------

    #[test]
    fn test_redo_roundtrip() {
        let mut engine = RoomStorageEngine::new();
        let frames = vec![make_storage_frame("1", OpCode::UpdateObject)];
        engine.push_to_redo(frames);
        assert!(engine.can_redo());

        let popped = engine.redo().unwrap();
        assert_eq!(popped.len(), 1);
        assert!(!engine.can_redo());
    }

    #[test]
    fn test_redo_clears_paused_history() {
        let mut engine = RoomStorageEngine::new();
        engine.push_to_redo(vec![make_storage_frame("1", OpCode::UpdateObject)]);
        engine.pause_history();
        engine.redo();
        assert!(engine.paused_history.is_none());
    }

    // -- on_dispatch_outside_batch ------------------------------------------

    #[test]
    fn test_on_dispatch_outside_batch() {
        let mut engine = RoomStorageEngine::new();
        // Add some redo entries
        engine.push_to_redo(vec![make_storage_frame("r1", OpCode::UpdateObject)]);
        assert!(engine.can_redo());

        // Dispatch outside batch should push to undo and clear redo
        engine.on_dispatch_outside_batch(vec![make_storage_frame("u1", OpCode::UpdateObject)]);
        assert!(engine.can_undo());
        assert!(!engine.can_redo());
    }

    // -- Paused history tests -----------------------------------------------

    #[test]
    fn test_pause_and_resume() {
        let mut engine = RoomStorageEngine::new();
        engine.pause_history();

        // While paused, frames go into the pause buffer
        engine.add_to_undo_stack(vec![make_storage_frame("a", OpCode::UpdateObject)]);
        engine.add_to_undo_stack(vec![make_storage_frame("b", OpCode::UpdateObject)]);

        assert_eq!(engine.undo_stack.len(), 0); // Not on the real stack yet

        engine.resume_history();
        assert_eq!(engine.undo_stack.len(), 1); // Committed as single entry
        let entry = engine.undo().unwrap();
        assert_eq!(entry.len(), 2); // Both frames in one entry
    }

    #[test]
    fn test_pause_idempotent() {
        let mut engine = RoomStorageEngine::new();
        engine.pause_history();
        engine.add_to_undo_stack(vec![make_storage_frame("a", OpCode::UpdateObject)]);
        engine.pause_history(); // should NOT reset the deque
        engine.add_to_undo_stack(vec![make_storage_frame("b", OpCode::UpdateObject)]);

        engine.resume_history();
        let entry = engine.undo().unwrap();
        assert_eq!(entry.len(), 2); // Both frames preserved
    }

    #[test]
    fn test_resume_without_pause_is_noop() {
        let mut engine = RoomStorageEngine::new();
        engine.resume_history(); // should not panic
        assert!(!engine.can_undo());
    }

    // -- Unacked ops tests --------------------------------------------------

    #[test]
    fn test_track_and_classify() {
        let mut engine = RoomStorageEngine::new();
        let op = make_op("node1", OpCode::UpdateObject, Some("op-1"));
        engine.track_unacked_op("op-1".to_string(), op.clone());
        assert!(engine.has_unacked_ops());

        // Classify same op → OURS, removes from unacked
        assert_eq!(engine.classify_remote_op(&op), OpSourceResult::Ours);
        assert!(!engine.has_unacked_ops());
    }

    #[test]
    fn test_classify_unknown_op_is_theirs() {
        let mut engine = RoomStorageEngine::new();
        let op = make_op("node1", OpCode::UpdateObject, Some("op-unknown"));
        assert_eq!(engine.classify_remote_op(&op), OpSourceResult::Theirs);
    }

    #[test]
    fn test_classify_op_without_opid_is_theirs() {
        let mut engine = RoomStorageEngine::new();
        let op = make_op("node1", OpCode::UpdateObject, None);
        assert_eq!(engine.classify_remote_op(&op), OpSourceResult::Theirs);
    }

    // -- Batch tests --------------------------------------------------------

    #[test]
    fn test_batch_lifecycle() {
        let mut engine = RoomStorageEngine::new();
        assert!(!engine.is_batching());

        engine.start_batch();
        assert!(engine.is_batching());

        let ops = vec![make_op("1", OpCode::UpdateObject, Some("op-1"))];
        let reverse = vec![make_storage_frame("1", OpCode::UpdateObject)];
        engine.batch_accumulate(ops, reverse);

        let (result_ops, result_reverse) = engine.end_batch().unwrap();
        assert_eq!(result_ops.len(), 1);
        assert_eq!(result_reverse.len(), 1);
        assert!(!engine.is_batching());
    }

    #[test]
    fn test_batch_reverse_push_left_semantics() {
        let mut engine = RoomStorageEngine::new();
        engine.start_batch();

        // First dispatch
        engine.batch_add_reverse(vec![make_storage_frame("first", OpCode::UpdateObject)]);
        // Second dispatch
        engine.batch_add_reverse(vec![make_storage_frame("second", OpCode::UpdateObject)]);

        let (_, reverse) = engine.end_batch().unwrap();
        // "second" was pushed left, so it should come first
        if let Stackframe::StorageOp(op) = &reverse[0] {
            assert_eq!(op.id, "second");
        }
        if let Stackframe::StorageOp(op) = &reverse[1] {
            assert_eq!(op.id, "first");
        }
    }

    #[test]
    fn test_end_batch_without_start_returns_none() {
        let mut engine = RoomStorageEngine::new();
        assert!(engine.end_batch().is_none());
    }

    // -- Storage status tests -----------------------------------------------

    #[test]
    fn test_storage_sync_status() {
        let engine = RoomStorageEngine::new();
        assert_eq!(engine.storage_sync_status(false, false), "not-loaded");
        assert_eq!(engine.storage_sync_status(false, true), "loading");
        assert_eq!(engine.storage_sync_status(true, false), "synchronized");
        assert_eq!(engine.storage_sync_status(true, true), "synchronized");
    }

    #[test]
    fn test_storage_sync_status_with_unacked() {
        let mut engine = RoomStorageEngine::new();
        engine.track_unacked_op(
            "op-1".to_string(),
            make_op("1", OpCode::UpdateObject, Some("op-1")),
        );
        assert_eq!(engine.storage_sync_status(true, true), "synchronizing");
    }

    // -- Checkpoint tests ---------------------------------------------------

    #[test]
    fn test_save_restore_checkpoint() {
        let mut engine = RoomStorageEngine::new();
        engine.add_to_undo_stack(vec![make_storage_frame("1", OpCode::UpdateObject)]);
        engine.add_to_undo_stack(vec![make_storage_frame("2", OpCode::UpdateObject)]);

        let checkpoint = engine.save_undo_checkpoint();
        assert_eq!(checkpoint, 2);

        engine.add_to_undo_stack(vec![make_storage_frame("3", OpCode::UpdateObject)]);
        assert_eq!(engine.undo_stack.len(), 3);

        engine.restore_undo_checkpoint(checkpoint);
        assert_eq!(engine.undo_stack.len(), 2);
    }

    // -- Clear history test -------------------------------------------------

    #[test]
    fn test_clear_history() {
        let mut engine = RoomStorageEngine::new();
        engine.add_to_undo_stack(vec![make_storage_frame("1", OpCode::UpdateObject)]);
        engine.push_to_redo(vec![make_storage_frame("2", OpCode::UpdateObject)]);
        assert!(engine.can_undo());
        assert!(engine.can_redo());

        engine.clear_history();
        assert!(!engine.can_undo());
        assert!(!engine.can_redo());
    }

    // -- Stackframe serialization tests -------------------------------------

    #[test]
    fn test_stackframe_storage_op_serde() {
        let frame = make_storage_frame("node-1", OpCode::UpdateObject);
        let json = serde_json::to_value(&frame).unwrap();

        // Should have "type" as integer (OpCode::UpdateObject = 3)
        assert_eq!(json["type"], 3);
        assert_eq!(json["id"], "node-1");

        // Roundtrip
        let deserialized: Stackframe = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized, frame);
    }

    #[test]
    fn test_stackframe_presence_serde() {
        let data = serde_json::json!({"cursor": {"x": 10, "y": 20}});
        let frame = make_presence_frame(data.clone());
        let json = serde_json::to_value(&frame).unwrap();

        // Should have "type": "presence" and "data": {...}
        assert_eq!(json["type"], "presence");
        assert_eq!(json["data"]["cursor"]["x"], 10);

        // Roundtrip
        let deserialized: Stackframe = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized, frame);
    }

    // -- Presence frame in undo stack tests ---------------------------------

    #[test]
    fn test_mixed_presence_and_storage_frames() {
        let mut engine = RoomStorageEngine::new();
        let frames = vec![
            make_storage_frame("1", OpCode::UpdateObject),
            make_presence_frame(serde_json::json!({"x": 100})),
        ];
        engine.add_to_undo_stack(frames);

        let popped = engine.undo().unwrap();
        assert_eq!(popped.len(), 2);
        assert!(matches!(&popped[0], Stackframe::StorageOp(_)));
        assert!(matches!(&popped[1], Stackframe::Presence(_)));
    }
}
