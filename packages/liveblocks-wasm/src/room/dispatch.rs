//! Server message dispatch.
//!
//! Routes each incoming ServerMsg to the appropriate handler on the Room.

use std::collections::HashMap;

use serde_json::Value as JsonValue;

use crate::ops::apply::apply_op;
use crate::platform::{HttpClient, WebSocketConnector};
use crate::protocol::client_msg::ClientMsg;
use crate::protocol::server_msg::ServerMsg;
use crate::room_engine::OpSourceResult;
use crate::types::{Op, OpSource};

use super::Room;

/// Dispatch a single server message to the appropriate Room handler.
pub fn dispatch_server_msg<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    msg: ServerMsg,
) {
    match msg {
        ServerMsg::RoomState {
            actor,
            nonce,
            scopes,
            users,
            ..
        } => {
            handle_room_state(room, actor, nonce, scopes, users);
        }

        ServerMsg::UpdatePresence {
            actor,
            data,
            target_actor,
        } => {
            handle_update_presence(room, actor, data, target_actor);
        }

        ServerMsg::UserJoined {
            actor,
            id: _,
            info,
            scopes: _,
        } => {
            handle_user_joined(room, actor, info);
        }

        ServerMsg::UserLeft { actor } => {
            handle_user_left(room, actor);
        }

        ServerMsg::BroadcastedEvent { actor, event } => {
            room.events.notify_custom_event(actor, event);
        }

        ServerMsg::StorageState { items } => {
            handle_storage_state(room, items);
        }

        ServerMsg::UpdateStorage { ops } => {
            handle_update_storage(room, ops);
        }

        ServerMsg::RejectStorageOp {
            op_ids: _op_ids,
            reason: _reason,
        } => {
            #[cfg(debug_assertions)]
            eprintln!("Storage ops rejected: {:?} - {}", _op_ids, _reason);
        }

        ServerMsg::UpdateYdoc {
            update,
            is_sync,
            state_vector,
            guid,
            v2,
            remote_snapshot_hash,
        } => {
            room.events.notify_ydoc_update(
                update,
                is_sync,
                state_vector,
                guid,
                v2,
                remote_snapshot_hash,
            );
        }

        // Comment/thread events — fire a generic notification
        ServerMsg::ThreadCreated { thread_id }
        | ServerMsg::ThreadMetadataUpdated { thread_id }
        | ServerMsg::ThreadDeleted { thread_id }
        | ServerMsg::ThreadUpdated { thread_id } => {
            room.events.notify_custom_event(
                -1,
                serde_json::json!({ "threadId": thread_id }),
            );
        }

        ServerMsg::CommentCreated { thread_id, comment_id }
        | ServerMsg::CommentEdited { thread_id, comment_id }
        | ServerMsg::CommentDeleted { thread_id, comment_id } => {
            room.events.notify_custom_event(
                -1,
                serde_json::json!({ "threadId": thread_id, "commentId": comment_id }),
            );
        }

        ServerMsg::CommentReactionAdded { thread_id, comment_id, emoji }
        | ServerMsg::CommentReactionRemoved { thread_id, comment_id, emoji } => {
            room.events.notify_custom_event(
                -1,
                serde_json::json!({
                    "threadId": thread_id,
                    "commentId": comment_id,
                    "emoji": emoji
                }),
            );
        }

        ServerMsg::CommentMetadataUpdated { thread_id, comment_id } => {
            room.events.notify_custom_event(
                -1,
                serde_json::json!({ "threadId": thread_id, "commentId": comment_id }),
            );
        }

    }
}

fn handle_room_state<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    actor: i32,
    nonce: String,
    scopes: Vec<String>,
    users: HashMap<String, JsonValue>,
) {
    // Set session info
    room.session = Some(super::DynamicSessionInfo {
        actor,
        nonce,
        scopes,
    });

    // Configure ID generator with actor ID
    room.id_gen.set_connection_id(actor);

    // Update presence with user connections
    let connection_map: HashMap<i32, JsonValue> = users
        .into_iter()
        .filter_map(|(k, v)| k.parse::<i32>().ok().map(|id| (id, v)))
        .collect();
    room.presence.handle_room_state(connection_map);
}

fn handle_update_presence<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    actor: i32,
    data: JsonValue,
    target_actor: Option<i32>,
) {
    // If targeted to a specific actor, ignore if not us
    if let Some(target) = target_actor {
        if let Some(session) = &room.session {
            if target != session.actor {
                return;
            }
        }
    }

    // Full presence = target_actor is Some (initial full broadcast)
    let is_full = target_actor.is_some();
    let _became_visible = room.presence.handle_update_presence(actor, data, is_full);

    // Notify others change
    let others_json = room.presence.others_as_json();
    if let JsonValue::Array(arr) = &others_json {
        room.events.notify_others_change(arr);
    }
}

fn handle_user_joined<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    actor: i32,
    info: Option<JsonValue>,
) {
    room.presence.handle_user_joined(actor, info.unwrap_or(JsonValue::Null));

    // Send our full presence to the joiner
    if room.session.is_some() {
        room.buffer.push(ClientMsg::UpdatePresence {
            target_actor: Some(actor),
            data: room.presence.my_presence().clone(),
        });
    }
}

fn handle_user_left<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    actor: i32,
) {
    room.presence.handle_user_left(actor);

    let others_json = room.presence.others_as_json();
    if let JsonValue::Array(arr) = &others_json {
        room.events.notify_others_change(arr);
    }
}

fn handle_storage_state<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    items: Vec<(String, crate::types::SerializedCrdt)>,
) {
    let is_reconnect = room.storage_status == super::StorageStatus::Loaded
        || room.storage_status == super::StorageStatus::Synchronized;

    if is_reconnect {
        // Diff + apply
        let ops = super::storage::diff_for_reconnect(&room.document, &items);
        for op in &ops {
            apply_op(&mut room.document, op, OpSource::Theirs);
        }
    } else {
        // First load — hydrate (replace document)
        room.document = super::storage::hydrate_storage(&items);
    }

    room.storage_status = super::StorageStatus::Loaded;
    room.events.notify_storage_loaded();
    room.events.notify_storage_status("loaded");
    room.events.notify_storage_change();
}

fn handle_update_storage<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    ops: Vec<Op>,
) {
    for op in &ops {
        // Classify: is this our own ACKed op or a remote op?
        let source = room.storage_engine.classify_remote_op(op);
        match source {
            OpSourceResult::Theirs => {
                apply_op(&mut room.document, op, OpSource::Theirs);
            }
            OpSourceResult::Ours => {
                // Already applied locally — just acknowledge
            }
        }
    }

    room.events.notify_storage_change();
}
