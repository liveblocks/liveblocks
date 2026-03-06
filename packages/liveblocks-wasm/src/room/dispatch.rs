//! Server message dispatch.
//!
//! Routes each incoming ServerMsg to the appropriate handler on the Room.

use std::collections::HashMap;

use serde_json::Value as JsonValue;

use crate::connection::fsm::ConnEvent;
use crate::ops::apply::apply_op;
use crate::platform::{HttpClient, WebSocketConnector};
use crate::protocol::client_msg::ClientMsg;
use crate::protocol::server_msg::{ServerMsg, compact_nodes_to_id_tuples};
use crate::room_engine::OpSourceResult;
use crate::types::{ApplyResult, CrdtType, Op, OpSource};
use crate::updates::StorageUpdate;

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
            // Notify the FSM that ROOM_STATE was received so it can
            // transition to Connected. This must happen after handle_room_state
            // so the actor ID is set before status changes.
            room.managed_socket.send_event_sync(ConnEvent::RoomStateReceived);
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
            scopes,
        } => {
            handle_user_joined(room, actor, info, scopes);
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

        ServerMsg::StorageChunk { nodes } => {
            let items = compact_nodes_to_id_tuples(&nodes);
            room.pending_storage_chunks.extend(items);
        }

        ServerMsg::StorageStreamEnd => {
            let items = std::mem::take(&mut room.pending_storage_chunks);
            handle_storage_state(room, items);
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

    // Send initial full presence to other users (targetActor: -1 = broadcast).
    // Use push_front so presence comes before any already-buffered FetchStorage.
    room.buffer.push_front(ClientMsg::UpdatePresence {
        target_actor: Some(-1),
        data: room.presence.my_presence().clone(),
    });
}

fn handle_update_presence<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    actor: i32,
    data: JsonValue,
    target_actor: Option<i32>,
) {
    // If targeted to a specific actor (not broadcast), ignore if not us.
    // target_actor == -1 means broadcast to all, so always accept.
    if let Some(target) = target_actor {
        if target != -1 {
            if let Some(session) = &room.session {
                if target != session.actor {
                    return;
                }
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
    scopes: Vec<String>,
) {
    room.presence.handle_user_joined(actor, info.unwrap_or(JsonValue::Null), scopes);

    // Notify others change
    let others_json = room.presence.others_as_json();
    if let JsonValue::Array(arr) = &others_json {
        room.events.notify_others_change(arr);
    }

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
        // Diff + apply, collecting updates
        let ops = super::storage::diff_for_reconnect(&room.document, &items);
        let mut all_updates: Vec<StorageUpdate> = Vec::new();
        for op in &ops {
            let result = apply_op(&mut room.document, op, OpSource::Theirs);
            if let crate::types::ApplyResult::Modified { update, .. } = result {
                merge_storage_update(&mut all_updates, update);
            }
        }

        // Re-apply unacked ops to the local document (the diff may have removed them)
        // and resend them to the server.
        let unacked: Vec<Op> = room.storage_engine.get_unacked_ops().values().cloned().collect();
        if !unacked.is_empty() {
            for op in &unacked {
                let result = apply_op(&mut room.document, op, OpSource::Local);
                if let crate::types::ApplyResult::Modified { update, .. } = result {
                    merge_storage_update(&mut all_updates, update);
                }
            }
            room.buffer.push(crate::protocol::client_msg::ClientMsg::UpdateStorage { ops: unacked });
        }

        room.storage_status = super::StorageStatus::Loaded;
        room.events.notify_storage_loaded();
        room.events.notify_storage_status("loaded");
        if !all_updates.is_empty() {
            room.events.notify_storage_change_with_updates(all_updates, OpSource::Theirs);
        } else {
            room.events.notify_storage_change(OpSource::Theirs);
        }
    } else {
        // First load — hydrate (replace document)
        room.document = super::storage::hydrate_storage(&items);
        room.storage_status = super::StorageStatus::Loaded;
        room.events.notify_storage_loaded();
        room.events.notify_storage_status("loaded");
        room.events.notify_storage_change(OpSource::Theirs);
    }
}

fn handle_update_storage<C: WebSocketConnector, H: HttpClient>(
    room: &mut Room<C, H>,
    ops: Vec<Op>,
) {
    use crate::types::OpCode;
    use std::collections::HashSet;

    let mut all_updates: Vec<StorageUpdate> = Vec::new();
    let mut any_applied = false;
    // Track nodes created by CREATE ops in this batch — their individual
    // updates are redundant (the parent's insert/set already captures them).
    let mut created_node_ids: HashSet<String> = HashSet::new();

    for op in &ops {
        // Track created nodes
        let is_create = matches!(
            op.op_code,
            OpCode::CreateObject | OpCode::CreateList | OpCode::CreateMap | OpCode::CreateRegister
        );
        if is_create {
            created_node_ids.insert(op.id.clone());
        }

        // Classify: is this our own ACKed op or a remote op?
        let source = room.storage_engine.classify_remote_op(op);
        match source {
            OpSourceResult::Theirs => {
                // For LiveObject/LiveMap parents, reject remote CREATE ops that
                // target the same parentKey as an unacked local CREATE op
                // (local value takes precedence until acknowledged).
                // For LiveList parents, both items coexist — no conflict.
                if conflicts_with_unacked_op(room, op) {
                    continue;
                }
                let result = apply_op(&mut room.document, op, OpSource::Theirs);
                if let ApplyResult::Modified { update, .. } = result {
                    merge_storage_update(&mut all_updates, update);
                    any_applied = true;
                }
            }
            OpSourceResult::Ours => {
                // Already applied locally. Re-apply selectively to handle
                // conflict resolution and server-side reordering:
                //
                // CREATE ACKs: Always re-apply. apply_create handles:
                //   - Position unchanged, node in children → NotModified
                //   - Position changed → conflict resolution
                //   - Orphaned node (implicitly deleted) → re-inserts
                //   - Set ACK with deleted_id → processes deletion
                //   - Node not in arena → re-creates (JS does same in
                //     _applyInsertAck → #createAttachItemAndSort)
                //
                // DELETE ACKs: Always re-apply. Normally a no-op (node
                //   already deleted locally → returns NotModified). But when
                //   a preceding CREATE ACK in the same batch re-created the
                //   node, the DELETE ACK must clean it up. Matches JS which
                //   applies all ops in an UpdateStorage batch sequentially.
                //
                // UPDATE/MOVE ACKs: Only re-apply when position differs
                //   (optimization — these were already applied locally).
                let is_delete = matches!(
                    op.op_code,
                    OpCode::DeleteCrdt | OpCode::DeleteObjectKey
                );
                let should_reapply = is_create
                    || is_delete
                    || ack_position_differs(&room.document, op);
                if should_reapply {
                    let result = apply_op(&mut room.document, op, OpSource::Ours);
                    if let ApplyResult::Modified { update, .. } = result {
                        merge_storage_update(&mut all_updates, update);
                        any_applied = true;
                    }
                }
            }
        }
    }

    // Filter out updates for nodes that were just created in this batch.
    // Their parent's insert/set update already captures the child state.
    if !created_node_ids.is_empty() {
        all_updates.retain(|u| {
            let node_id = match u {
                StorageUpdate::LiveObjectUpdate { node_id, .. } => node_id,
                StorageUpdate::LiveListUpdate { node_id, .. } => node_id,
                StorageUpdate::LiveMapUpdate { node_id, .. } => node_id,
            };
            !created_node_ids.contains(node_id)
        });
    }

    // Only fire storage change if any ops were actually applied (not just ACKs)
    if any_applied {
        room.events.notify_storage_change_with_updates(all_updates, OpSource::Theirs);
    }
}

/// Check if an ACK op carries a different position (parentKey) than the
/// node currently has in the document. Returns true when re-application
/// is needed to trigger conflict resolution.
fn ack_position_differs(document: &crate::document::Document, op: &Op) -> bool {
    // Look up the node in the document by its ID
    if let Some(node) = document.get_node_by_id(&op.id) {
        // Compare parentKey — if ACK carries a different position, re-apply
        if let Some(ack_parent_key) = &op.parent_key {
            if let Some(current_key) = &node.parent_key {
                return current_key != ack_parent_key;
            }
        }
    }
    false
}

/// Check if a remote op conflicts with any unacked local op on a
/// LiveObject or LiveMap parent. For LiveList parents, items coexist
/// at the same position key, so no conflict filtering is needed.
fn conflicts_with_unacked_op<C: WebSocketConnector, H: HttpClient>(
    room: &Room<C, H>,
    remote_op: &Op,
) -> bool {
    use crate::types::{CrdtType, OpCode};

    // Only check CREATE_* ops — these set a child at a location
    let is_create = matches!(
        remote_op.op_code,
        OpCode::CreateObject | OpCode::CreateList | OpCode::CreateMap | OpCode::CreateRegister
    );
    if !is_create {
        return false;
    }

    let remote_parent_id = match &remote_op.parent_id {
        Some(id) => id,
        None => return false,
    };
    let remote_parent_key = match &remote_op.parent_key {
        Some(key) => key,
        None => return false,
    };

    // Check parent type — only conflict-filter for Object, not List or Map.
    // For LiveList: items coexist at the same position, no conflict.
    // For LiveMap: remote ops should be applied immediately (last-writer-wins);
    // the local value is restored when the local ACK arrives and re-creates
    // the node via apply_create's "Node NOT in arena" path.
    if let Some(parent_node) = room.document.get_node_by_id(remote_parent_id) {
        if parent_node.node_type == CrdtType::List || parent_node.node_type == CrdtType::Map {
            return false;
        }
    }

    // Check against all unacked local ops
    for (_op_id, local_op) in room.storage_engine().get_unacked_ops() {
        let local_is_create = matches!(
            local_op.op_code,
            OpCode::CreateObject | OpCode::CreateList | OpCode::CreateMap | OpCode::CreateRegister
        );
        if !local_is_create {
            continue;
        }
        if let (Some(local_parent_id), Some(local_parent_key)) =
            (&local_op.parent_id, &local_op.parent_key)
        {
            if local_parent_id == remote_parent_id && local_parent_key == remote_parent_key {
                return true;
            }
        }
    }

    false
}

/// Merge a StorageUpdate into a list, combining updates for the same node.
/// Public alias for use from sibling modules.
pub fn merge_storage_update_pub(updates: &mut Vec<StorageUpdate>, new_update: StorageUpdate) {
    merge_storage_update(updates, new_update);
}

fn merge_storage_update(updates: &mut Vec<StorageUpdate>, new_update: StorageUpdate) {
    let node_id = match &new_update {
        StorageUpdate::LiveObjectUpdate { node_id, .. } => node_id.clone(),
        StorageUpdate::LiveListUpdate { node_id, .. } => node_id.clone(),
        StorageUpdate::LiveMapUpdate { node_id, .. } => node_id.clone(),
    };

    // Find existing update for same node
    if let Some(existing) = updates.iter_mut().find(|u| match u {
        StorageUpdate::LiveObjectUpdate { node_id: id, .. } => *id == node_id,
        StorageUpdate::LiveListUpdate { node_id: id, .. } => *id == node_id,
        StorageUpdate::LiveMapUpdate { node_id: id, .. } => *id == node_id,
    }) {
        match (existing, new_update) {
            (
                StorageUpdate::LiveObjectUpdate { updates: existing_updates, .. },
                StorageUpdate::LiveObjectUpdate { updates: new_updates, .. },
            ) => {
                existing_updates.extend(new_updates);
            }
            (
                StorageUpdate::LiveListUpdate { updates: existing_updates, .. },
                StorageUpdate::LiveListUpdate { updates: new_updates, .. },
            ) => {
                existing_updates.extend(new_updates);
            }
            (
                StorageUpdate::LiveMapUpdate { updates: existing_updates, .. },
                StorageUpdate::LiveMapUpdate { updates: new_updates, .. },
            ) => {
                existing_updates.extend(new_updates);
            }
            (existing_ref, new_update) => {
                // Different types — just replace
                *existing_ref = new_update;
            }
        }
    } else {
        updates.push(new_update);
    }
}
