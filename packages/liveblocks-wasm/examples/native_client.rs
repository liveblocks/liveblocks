//! Native Rust client that connects to a Liveblocks room, loads storage,
//! demonstrates the handle-based mutation API, and prints events.
//!
//! Run the Liveblocks dev server first:
//!
//!   npx liveblocks-cli dev
//!
//! Then run this example:
//!
//!   cargo run --features native --example native_client -p liveblocks-wasm

use liveblocks_wasm::native_api::{
    LiveRoom, RoomBuilder, RoomEvent, Status, StorageStatus,
};

#[tokio::main]
async fn main() {
    let room = RoomBuilder::new("my-native-room")
        .public_key("pk_test_xxx")
        .base_url("http://localhost:9999")
        .initial_presence(serde_json::json!({ "cursor": null }))
        .build();

    let live = LiveRoom::new(room);

    println!("Connecting to room '{}'...", live.room_id());
    live.connect().await;

    let mut storage_demo_done = false;

    // Main event loop: poll for WebSocket events and process them.
    loop {
        // Block until the next WebSocket frame arrives.
        if !live.poll_ws_event().await {
            println!("WebSocket closed, exiting.");
            break;
        }

        // Feed socket events into the Room state machine.
        live.process_socket_events();

        // If we just connected and haven't requested storage yet, do so.
        if live.status() == Status::Connected
            && live.storage_status() == StorageStatus::NotLoaded
        {
            println!("Connected! Requesting storage...");
            live.fetch_storage();
            live.flush();
        }

        // Drain and print all events produced this tick.
        for event in live.take_events() {
            match &event {
                RoomEvent::StatusChanged(status) => {
                    println!("[event] Status changed: {status}");
                }
                RoomEvent::StorageLoaded => {
                    println!("[event] Storage loaded!");
                    println!(
                        "  Document has {} nodes",
                        live.document_len()
                    );
                }
                RoomEvent::StorageChanged { .. } => {
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

        // Demonstrate the mutation API once storage is loaded.
        if live.storage_status() == StorageStatus::Loaded && !storage_demo_done {
            storage_demo_done = true;
            demonstrate_mutations(&live);
        }

        // Flush any queued outbound messages.
        live.flush();
    }
}

fn demonstrate_mutations(live: &LiveRoom) {
    println!("\n--- Handle-based Mutation API Demo ---\n");

    // Get the root LiveObject
    let root = match live.root() {
        Some(obj) => obj,
        None => {
            println!("No root node found.");
            return;
        }
    };
    println!("Root node ID: {}", root.node_id());

    // Read all keys on the root object
    let keys = root.keys();
    println!("Root keys: {keys:?}");

    // Set a scalar property (using Into<Json> ergonomics)
    root.set("greeting", "Hello from Rust!");
    println!("Set root.greeting = \"Hello from Rust!\"");

    // Read it back
    if let Some(val) = root.get("greeting") {
        println!("Read root.greeting = {val:?}");
    }

    // Set a numeric property
    root.set("counter", 42.0);
    println!("Set root.counter = 42");

    // Read the whole root as immutable JSON
    if let Some(snapshot) = root.to_immutable() {
        println!("Root snapshot: {snapshot:?}");
    }

    // Navigate to a nested list (if one exists)
    if let Some(list) = root.get_list("items") {
        println!("\nFound list at root.items (id: {})", list.node_id());
        println!("  Length: {}", list.length());

        // Push an item
        list.push("native-item");
        println!("  Pushed \"native-item\"");
        println!("  New length: {}", list.length());

        // Read items
        if let Some(items) = list.to_immutable() {
            println!("  Items: {items:?}");
        }

        // Undo the push
        live.undo();
        println!("  After undo, length: {}", list.length());

        // Redo
        live.redo();
        println!("  After redo, length: {}", list.length());
    } else {
        println!("\nNo 'items' list found on root, skipping list demo.");
    }

    // Navigate to a nested map (if one exists)
    if let Some(map) = root.get_map("settings") {
        println!("\nFound map at root.settings (id: {})", map.node_id());
        println!("  Size: {}", map.size());
        println!("  Keys: {:?}", map.keys());

        // Set a value
        map.set("theme", "dark");
        println!("  Set settings.theme = \"dark\"");

        // Read it back
        if let Some(val) = map.get("theme") {
            println!("  Read settings.theme = {val:?}");
        }
    } else {
        println!("\nNo 'settings' map found on root, skipping map demo.");
    }

    // Demonstrate batch mutations
    println!("\nBatch mutation:");
    let root_for_batch = root.clone();
    live.batch(move || {
        root_for_batch.set("a", 1.0);
        root_for_batch.set("b", 2.0);
        root_for_batch.set("c", 3.0);
    });
    println!("  Set a=1, b=2, c=3 in a single batch");
    println!("  Can undo (single step): {}", live.can_undo());

    // Undo the batch (undoes all three sets at once)
    live.undo();
    println!("  After undo: a={:?}, b={:?}, c={:?}",
        root.get("a"),
        root.get("b"),
        root.get("c"),
    );

    println!("\n--- Demo complete ---\n");
}
