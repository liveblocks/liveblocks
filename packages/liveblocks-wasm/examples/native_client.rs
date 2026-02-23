//! Minimal native Rust client that connects to a Liveblocks room, loads
//! storage, and prints events.
//!
//! Run the Liveblocks dev server first:
//!
//!   npx liveblocks-cli dev
//!
//! Then run this example:
//!
//!   cargo run --features native --example native_client -p liveblocks-wasm

use liveblocks_wasm::native_api::{RoomBuilder, RoomEvent, Status, StorageStatus};

#[tokio::main]
async fn main() {
    let mut room = RoomBuilder::new("my-native-room")
        .public_key("pk_test_xxx")
        .base_url("http://localhost:9999")
        .initial_presence(serde_json::json!({ "cursor": null }))
        .build();

    println!("Connecting to room '{}'...", room.room_id());
    room.connect().await;

    // Main event loop: poll for WebSocket events and process them.
    loop {
        // Block until the next WebSocket frame arrives.
        let got_event = room.poll_ws_event().await;
        if !got_event {
            println!("WebSocket closed, exiting.");
            break;
        }

        // Feed socket events into the Room state machine.
        room.process_socket_events();

        // If we just connected and haven't requested storage yet, do so.
        if room.status() == Status::Connected
            && room.storage_status() == StorageStatus::NotLoaded
        {
            println!("Connected! Requesting storage...");
            room.fetch_storage();
            room.flush();
        }

        // Drain and print all events produced this tick.
        for event in room.take_events() {
            match &event {
                RoomEvent::StatusChanged(status) => {
                    println!("[event] Status changed: {status}");
                }
                RoomEvent::StorageLoaded => {
                    println!("[event] Storage loaded!");
                    println!(
                        "  Document has {} nodes",
                        room.document().len()
                    );
                }
                RoomEvent::StorageChanged => {
                    println!("[event] Storage changed");
                }
                RoomEvent::Error { message, code } => {
                    println!("[event] Error (code {code}): {message}");
                }
                other => {
                    println!("[event] {other:?}");
                }
            }
        }

        // Flush any queued outbound messages.
        room.flush();
    }
}
