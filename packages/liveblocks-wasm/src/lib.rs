pub mod arena;
pub mod crdt;
pub mod document;
pub mod id_gen;
pub mod lson;
pub mod ops;
pub mod position;
pub mod room_engine;
pub mod snapshot;
pub mod tree_diff;
pub mod types;
pub mod updates;
pub mod yjs;

// New modules for the full Rust client
pub mod protocol;
pub mod auth;
pub mod connection;
pub mod platform;
pub mod room;
pub mod http;

// Native-only modules
#[cfg(feature = "native")]
pub mod native_api;
#[cfg(feature = "native")]
pub mod native_handles;

// WASM-only modules
#[cfg(feature = "wasm")]
pub mod handles;
#[cfg(feature = "wasm")]
pub mod pool;
#[cfg(feature = "wasm")]
pub mod room_handle;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Compute a fractional position string.
/// Base-96 printable ASCII encoding, compatible with TypeScript position.ts.
#[cfg(feature = "wasm")]
#[wasm_bindgen(js_name = "makePosition")]
pub fn make_position(before: Option<String>, after: Option<String>) -> String {
    position::make_position(before.as_deref(), after.as_deref())
}
