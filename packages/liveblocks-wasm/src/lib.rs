pub mod arena;
pub mod crdt;
pub mod document;
pub mod handles;
pub mod ops;
pub mod pool;
pub mod position;
pub mod room_engine;
pub mod snapshot;
pub mod tree_diff;
pub mod types;
pub mod updates;
pub mod yjs;

use wasm_bindgen::prelude::*;

/// Compute a fractional position string.
/// Base-96 printable ASCII encoding, compatible with TypeScript position.ts.
#[wasm_bindgen(js_name = "makePosition")]
pub fn make_position(before: Option<String>, after: Option<String>) -> String {
    position::make_position(before.as_deref(), after.as_deref())
}
