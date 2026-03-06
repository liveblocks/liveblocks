//! WASM-bindgen RoomHandle: exports the full Rust Room to JavaScript.
//!
//! The RoomHandle wraps Room<JsDelegateConnector, WasmHttpClient> and exposes
//! every Room operation via wasm-bindgen. JS delegates for auth and socket
//! creation are wrapped in WASM platform adapters.

use std::cell::RefCell;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;

use serde::Serialize;
use serde_json::Value as JsonValue;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::connection::managed_socket::{AuthEndpoint, Delegates, ManagedSocket};
use crate::crdt::node::CrdtData;
use crate::crdt::{list, map, object};
use crate::ops::serialize::{
    create_register_op, delete_crdt_op, delete_object_key_op, set_parent_key_op, update_object_op,
};
use crate::platform::{
    HttpMethod, HttpRequest, HttpResponse, HttpClient, Timer, WebSocket,
    WebSocketConnector, WsEvent, WsEventReceiver,
};
use crate::room::events::RoomEvent;
use crate::room::Room;
use crate::types::{CrdtType, Json};

// ---------------------------------------------------------------------------
// JS Delegate WebSocket Connector
// ---------------------------------------------------------------------------

/// A WebSocket connector that wraps a JS `createSocket(url)` function.
///
/// The JS adapter is responsible for mapping its `delegates.createSocket(authValue)`
/// interface to this URL-based interface.
pub struct JsDelegateConnector {
    create_socket: js_sys::Function,
}

unsafe impl Send for JsDelegateConnector {}
unsafe impl Sync for JsDelegateConnector {}

/// A WebSocket wrapping a JS IWebSocketInstance.
pub struct JsWebSocket {
    inner: JsValue,
}

unsafe impl Send for JsWebSocket {}

impl WebSocket for JsWebSocket {
    fn send_text(&mut self, data: &str) -> Result<(), String> {
        let send_fn = js_sys::Reflect::get(&self.inner, &JsValue::from_str("send"))
            .map_err(|_| "No send method on WebSocket".to_string())?;
        let send_fn: js_sys::Function = send_fn
            .dyn_into()
            .map_err(|_| "send is not a function".to_string())?;
        send_fn
            .call1(&self.inner, &JsValue::from_str(data))
            .map_err(|e| format!("WebSocket send failed: {e:?}"))?;
        Ok(())
    }

    fn close(&mut self) -> Result<(), String> {
        let close_fn = js_sys::Reflect::get(&self.inner, &JsValue::from_str("close"))
            .map_err(|_| "No close method on WebSocket".to_string())?;
        let close_fn: js_sys::Function = close_fn
            .dyn_into()
            .map_err(|_| "close is not a function".to_string())?;
        close_fn
            .call0(&self.inner)
            .map_err(|e| format!("WebSocket close failed: {e:?}"))?;
        Ok(())
    }
}

/// Event receiver backed by a futures_channel mpsc, fed by JS WebSocket events.
pub struct JsWsEventReceiver {
    rx: futures_channel::mpsc::UnboundedReceiver<WsEvent>,
}

unsafe impl Send for JsWsEventReceiver {}

impl WsEventReceiver for JsWsEventReceiver {
    fn recv(&mut self) -> Pin<Box<dyn Future<Output = Option<WsEvent>> + '_>> {
        Box::pin(async move {
            use futures_util::StreamExt;
            self.rx.next().await
        })
    }

    fn try_recv(&mut self) -> Result<Option<WsEvent>, ()> {
        match self.rx.try_next() {
            Ok(Some(event)) => Ok(Some(event)),
            Ok(None) => Ok(None), // Channel closed
            Err(_) => Err(()),    // No events buffered
        }
    }
}

impl WebSocketConnector for JsDelegateConnector {
    type Socket = JsWebSocket;
    type Receiver = JsWsEventReceiver;

    fn connect(
        &self,
        url: &str,
    ) -> Pin<Box<dyn Future<Output = Result<(Self::Socket, Self::Receiver), String>> + '_>> {
        let url = url.to_string();
        let create_socket = self.create_socket.clone();
        Box::pin(async move {
            // Call JS createSocket(url) — returns an IWebSocketInstance
            let ws_instance = create_socket
                .call1(&JsValue::NULL, &JsValue::from_str(&url))
                .map_err(|e| format!("createSocket failed: {e:?}"))?;

            let (tx, rx) = futures_channel::mpsc::unbounded();

            // Hook into JS WebSocket events via addEventListener.
            // MockWebSocket (and real WebSocket) deliver events through
            // addEventListener, not through on* property setters.
            let add_event_listener = js_sys::Reflect::get(
                &ws_instance,
                &JsValue::from_str("addEventListener"),
            )
            .ok()
            .and_then(|v| v.dyn_into::<js_sys::Function>().ok())
            .ok_or_else(|| "No addEventListener on WebSocket".to_string())?;

            {
                let tx_open = tx.clone();
                let onopen = Closure::<dyn FnMut(JsValue)>::new(move |_event: JsValue| {
                    let _ = tx_open.unbounded_send(WsEvent::Open);
                });
                add_event_listener
                    .call2(
                        &ws_instance,
                        &JsValue::from_str("open"),
                        onopen.as_ref(),
                    )
                    .map_err(|_| "Failed to addEventListener open".to_string())?;
                onopen.forget();
            }

            {
                let tx_msg = tx.clone();
                let onmessage =
                    Closure::<dyn FnMut(JsValue)>::new(move |event: JsValue| {
                        // event.data is the message text
                        if let Ok(data) =
                            js_sys::Reflect::get(&event, &JsValue::from_str("data"))
                        {
                            if let Some(text) = data.as_string() {
                                let _ = tx_msg.unbounded_send(WsEvent::Message(text));
                            }
                        }
                    });
                add_event_listener
                    .call2(
                        &ws_instance,
                        &JsValue::from_str("message"),
                        onmessage.as_ref(),
                    )
                    .map_err(|_| "Failed to addEventListener message".to_string())?;
                onmessage.forget();
            }

            {
                let tx_close = tx.clone();
                let onclose =
                    Closure::<dyn FnMut(JsValue)>::new(move |event: JsValue| {
                        let code = js_sys::Reflect::get(&event, &JsValue::from_str("code"))
                            .ok()
                            .and_then(|v| v.as_f64())
                            .unwrap_or(1006.0) as u16;
                        let reason =
                            js_sys::Reflect::get(&event, &JsValue::from_str("reason"))
                                .ok()
                                .and_then(|v| v.as_string())
                                .unwrap_or_default();
                        let _ =
                            tx_close.unbounded_send(WsEvent::Close { code, reason });
                    });
                add_event_listener
                    .call2(
                        &ws_instance,
                        &JsValue::from_str("close"),
                        onclose.as_ref(),
                    )
                    .map_err(|_| "Failed to addEventListener close".to_string())?;
                onclose.forget();
            }

            {
                let tx_err = tx;
                let onerror =
                    Closure::<dyn FnMut(JsValue)>::new(move |event: JsValue| {
                        let message =
                            js_sys::Reflect::get(&event, &JsValue::from_str("message"))
                                .ok()
                                .and_then(|v| v.as_string())
                                .unwrap_or_else(|| "WebSocket error".to_string());
                        let _ = tx_err.unbounded_send(WsEvent::Error(message));
                    });
                add_event_listener
                    .call2(
                        &ws_instance,
                        &JsValue::from_str("error"),
                        onerror.as_ref(),
                    )
                    .map_err(|_| "Failed to addEventListener error".to_string())?;
                onerror.forget();
            }

            Ok((JsWebSocket { inner: ws_instance }, JsWsEventReceiver { rx }))
        })
    }
}

// ---------------------------------------------------------------------------
// WASM HTTP Client (reuses the one from platform/wasm_platform.rs)
// ---------------------------------------------------------------------------

/// WASM HTTP client using the Fetch API.
pub struct WasmFetchClient;

unsafe impl Send for WasmFetchClient {}
unsafe impl Sync for WasmFetchClient {}

impl HttpClient for WasmFetchClient {
    fn request(
        &self,
        req: HttpRequest,
    ) -> Pin<Box<dyn Future<Output = Result<HttpResponse, String>> + '_>> {
        Box::pin(async move {
            use wasm_bindgen_futures::JsFuture;
            use web_sys::{RequestInit, RequestMode};

            let opts = RequestInit::new();
            let method_str = match req.method {
                HttpMethod::Get => "GET",
                HttpMethod::Post => "POST",
                HttpMethod::Put => "PUT",
                HttpMethod::Delete => "DELETE",
            };
            opts.set_method(method_str);
            opts.set_mode(RequestMode::Cors);

            if let Some(body) = &req.body {
                opts.set_body(&JsValue::from_str(body));
            }

            let request = web_sys::Request::new_with_str_and_init(&req.url, &opts)
                .map_err(|e| format!("Failed to create request: {e:?}"))?;

            for (key, value) in &req.headers {
                request
                    .headers()
                    .set(key, value)
                    .map_err(|e| format!("Failed to set header: {e:?}"))?;
            }

            let window = web_sys::window()
                .or_else(|| {
                    // In Node.js/worker environments, try globalThis
                    js_sys::Reflect::get(&js_sys::global(), &JsValue::from_str("fetch"))
                        .ok()
                        .and_then(|_| None) // Just checking if fetch exists
                })
                .ok_or_else(|| "No global window".to_string())?;

            let resp_value = JsFuture::from(window.fetch_with_request(&request))
                .await
                .map_err(|e| format!("Fetch failed: {e:?}"))?;

            let resp: web_sys::Response = resp_value
                .dyn_into()
                .map_err(|_| "Response is not a Response object".to_string())?;

            let status = resp.status();
            let body = JsFuture::from(
                resp.text()
                    .map_err(|e| format!("Failed to get response text: {e:?}"))?,
            )
            .await
            .map_err(|e| format!("Failed to read response text: {e:?}"))?
            .as_string()
            .unwrap_or_default();

            Ok(HttpResponse { status, body })
        })
    }
}

// ---------------------------------------------------------------------------
// WASM Timer
// ---------------------------------------------------------------------------

pub struct WasmDelayTimer;

unsafe impl Send for WasmDelayTimer {}
unsafe impl Sync for WasmDelayTimer {}

impl Timer for WasmDelayTimer {
    fn delay(&self, delay_ms: u64) -> Pin<Box<dyn Future<Output = ()> + '_>> {
        Box::pin(async move {
            let promise = js_sys::Promise::new(&mut |resolve, _reject| {
                let _ = web_sys::window()
                    .expect("no global window")
                    .set_timeout_with_callback_and_timeout_and_arguments_0(
                        &resolve,
                        delay_ms as i32,
                    );
            });
            let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
        })
    }
}

// ---------------------------------------------------------------------------
// Subscription handle
// ---------------------------------------------------------------------------

struct Subscription {
    event_type: String,
    callback: js_sys::Function,
    id: u32,
}

// ---------------------------------------------------------------------------
// RoomHandle
// ---------------------------------------------------------------------------

type WasmRoom = Room<JsDelegateConnector, WasmFetchClient>;

/// Shared mutable state for the RoomHandle (needed for async operations).
struct RoomState {
    room: WasmRoom,
    subscriptions: Vec<Subscription>,
    next_sub_id: u32,
}

/// The WASM RoomHandle exported to JavaScript.
///
/// Wraps the Rust Room and exposes all operations via wasm-bindgen.
/// The JS adapter (`WasmRoom` in TypeScript) wraps this handle and
/// implements the full `Room<P,S,U,E,TM,CM>` interface.
#[wasm_bindgen]
pub struct RoomHandle {
    state: Rc<RefCell<RoomState>>,
}

#[wasm_bindgen]
impl RoomHandle {
    /// Create a new RoomHandle.
    ///
    /// Config object should contain:
    /// - `roomId: string`
    /// - `createSocket: (url: string) => IWebSocketInstance`
    /// - `authEndpoint: string | null` — POST URL for private auth
    /// - `publicApiKey: string | null` — public API key (pk_...)
    /// - `baseUrl: string` — e.g. "https://api.liveblocks.io"
    /// - `initialPresence: object`
    /// - `throttleDelay: number` (default 100)
    /// - `lostConnectionTimeout: number` (default 5000)
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Result<RoomHandle, JsValue> {
        let room_id = get_string(&config, "roomId")
            .ok_or_else(|| JsValue::from_str("roomId is required"))?;
        let base_url = get_string(&config, "baseUrl")
            .unwrap_or_else(|| "https://api.liveblocks.io".to_string());
        let throttle_delay = get_number(&config, "throttleDelay").unwrap_or(100.0) as u64;
        let lost_connection_timeout =
            get_number(&config, "lostConnectionTimeout").unwrap_or(5000.0) as u64;

        let initial_presence: JsonValue = get_js_value(&config, "initialPresence")
            .and_then(|v| serde_wasm_bindgen::from_value(v).ok())
            .unwrap_or(JsonValue::Object(serde_json::Map::new()));

        let create_socket = get_js_value(&config, "createSocket")
            .and_then(|v| v.dyn_into::<js_sys::Function>().ok())
            .ok_or_else(|| JsValue::from_str("createSocket function is required"))?;

        // Determine auth endpoint
        let auth_endpoint = if let Some(public_key) = get_string(&config, "publicApiKey") {
            AuthEndpoint::PublicKey(public_key)
        } else if let Some(auth_url) = get_string(&config, "authEndpoint") {
            AuthEndpoint::PrivateEndpoint { url: auth_url }
        } else {
            return Err(JsValue::from_str(
                "Either publicApiKey or authEndpoint is required",
            ));
        };

        let connector = JsDelegateConnector { create_socket };
        let http_client = WasmFetchClient;
        let timer = Box::new(WasmDelayTimer) as Box<dyn Timer>;

        let delegates = Delegates {
            connector,
            http_client,
            timer,
            auth_endpoint,
        };

        let managed_socket = ManagedSocket::new(delegates, room_id.clone(), base_url);

        let room = Room::new(
            managed_socket,
            room_id,
            initial_presence,
            throttle_delay,
            lost_connection_timeout,
        );

        let state = Rc::new(RefCell::new(RoomState {
            room,
            subscriptions: Vec::new(),
            next_sub_id: 1,
        }));

        // Set the wake callback on the managed socket so that when a deferred
        // timer event fires, it triggers processing of the deferred event.
        #[cfg(feature = "wasm")]
        {
            let state_for_wake = Rc::clone(&state);
            let wake_cb = Closure::<dyn FnMut()>::new(move || {
                // Process deferred events by spawning an async task
                // (same pattern as tick's deferred processing).
                let state = Rc::clone(&state_for_wake);
                wasm_bindgen_futures::spawn_local(async move {
                    state
                        .borrow_mut()
                        .room
                        .managed_socket
                        .process_deferred_events()
                        .await;

                    // Yield to the JS event loop (macrotask) to let the
                    // MockWebSocket's initFn fire (accept + ROOM_STATE).
                    // This ensures the socket is open before we fire events.
                    let yield_promise = js_sys::Promise::new(&mut |resolve, _| {
                        let set_timeout = js_sys::Reflect::get(
                            &js_sys::global(),
                            &wasm_bindgen::JsValue::from_str("setTimeout"),
                        ).expect("setTimeout not found");
                        let set_timeout: js_sys::Function = set_timeout.unchecked_into();
                        let _ = set_timeout.call2(
                            &wasm_bindgen::JsValue::NULL,
                            &resolve,
                            &wasm_bindgen::JsValue::from_f64(0.0),
                        );
                    });
                    let _ = wasm_bindgen_futures::JsFuture::from(yield_promise).await;

                    // After deferred events (e.g. reconnect), process socket
                    // events and fire JS callbacks.
                    state.borrow_mut().room.process_socket_events();
                    Self::fire_pending_events_with_state(&state);
                    state.borrow_mut().room.flush();

                    // Process any loopback messages from flush.
                    state.borrow_mut().room.process_socket_events();
                    Self::fire_pending_events_with_state(&state);
                });
            });
            state.borrow_mut().room.managed_socket.on_deferred_event =
                Some(wake_cb.as_ref().unchecked_ref::<js_sys::Function>().clone());
            wake_cb.forget(); // Leak the closure so it stays alive
        }

        Ok(RoomHandle { state })
    }

    // -- Connection --

    /// Connect to the room.
    pub fn connect(&self) {
        let state = Rc::clone(&self.state);
        wasm_bindgen_futures::spawn_local(async move {
            state.borrow_mut().room.connect().await;
        });
    }

    /// Disconnect from the room.
    pub fn disconnect(&self) {
        let state = Rc::clone(&self.state);
        wasm_bindgen_futures::spawn_local(async move {
            state.borrow_mut().room.disconnect().await;
        });
    }

    /// Reconnect to the room.
    pub fn reconnect(&self) {
        let state = Rc::clone(&self.state);
        wasm_bindgen_futures::spawn_local(async move {
            state.borrow_mut().room.reconnect().await;
        });
    }

    /// Get the current connection status.
    #[wasm_bindgen(js_name = "getStatus")]
    pub fn get_status(&self) -> String {
        let state = self.state.borrow();
        state.room.status().as_str().to_string()
    }

    // -- Presence --

    /// Get the local user's presence.
    #[wasm_bindgen(js_name = "getPresence")]
    pub fn get_presence(&self) -> JsValue {
        let state = self.state.borrow();
        let presence = state.room.presence().my_presence();
        presence.serialize(&serde_wasm_bindgen::Serializer::json_compatible())
            .unwrap_or(JsValue::UNDEFINED)
    }

    /// Update the local user's presence with a patch.
    #[wasm_bindgen(js_name = "updatePresence")]
    pub fn update_presence(&self, patch: JsValue) -> Result<(), JsValue> {
        let json: JsonValue = serde_wasm_bindgen::from_value(patch)
            .map_err(|e| JsValue::from_str(&format!("Invalid presence patch: {e}")))?;
        self.state.borrow_mut().room.update_presence(json);
        self.fire_pending_events();
        Ok(())
    }

    /// Get all other users.
    #[wasm_bindgen(js_name = "getOthers")]
    pub fn get_others(&self) -> JsValue {
        let state = self.state.borrow();
        let others = state.room.presence().others_as_json();
        others.serialize(&serde_wasm_bindgen::Serializer::json_compatible())
            .unwrap_or(JsValue::UNDEFINED)
    }

    /// Get "self" (my connection info).
    #[wasm_bindgen(js_name = "getSelf")]
    pub fn get_self_info(&self) -> JsValue {
        let state = self.state.borrow();
        if let Some(actor) = state.room.actor_id() {
            let mut obj = serde_json::Map::new();
            obj.insert(
                "connectionId".to_string(),
                JsonValue::from(actor),
            );
            obj.insert(
                "presence".to_string(),
                state.room.presence().my_presence().clone(),
            );
            JsonValue::Object(obj).serialize(&serde_wasm_bindgen::Serializer::json_compatible())
                .unwrap_or(JsValue::UNDEFINED)
        } else {
            JsValue::NULL
        }
    }

    // -- Storage --

    /// Request storage from the server.
    #[wasm_bindgen(js_name = "fetchStorage")]
    pub fn fetch_storage(&self) {
        self.state.borrow_mut().room.fetch_storage();
    }

    /// Get the current storage status as a JS-compatible string.
    #[wasm_bindgen(js_name = "getStorageStatus")]
    pub fn get_storage_status(&self) -> String {
        let state = self.state.borrow();
        match state.room.storage_status() {
            crate::room::StorageStatus::NotLoaded => "not-loaded".into(),
            crate::room::StorageStatus::Loading => "loading".into(),
            crate::room::StorageStatus::Loaded | crate::room::StorageStatus::Synchronized => {
                if state.room.storage_engine().has_unacked_ops() {
                    "synchronizing".into()
                } else {
                    "synchronized".into()
                }
            }
        }
    }

    // -- History --

    /// Undo the last local operation.
    pub fn undo(&self) {
        self.state.borrow_mut().room.undo();
        self.fire_pending_events();
    }

    /// Redo the last undone operation.
    pub fn redo(&self) {
        self.state.borrow_mut().room.redo();
        self.fire_pending_events();
    }

    /// Can undo?
    #[wasm_bindgen(js_name = "canUndo")]
    pub fn can_undo(&self) -> bool {
        self.state.borrow().room.can_undo()
    }

    /// Can redo?
    #[wasm_bindgen(js_name = "canRedo")]
    pub fn can_redo(&self) -> bool {
        self.state.borrow().room.can_redo()
    }

    /// Check if the current session has storage write permissions.
    #[wasm_bindgen(js_name = "canWriteStorage")]
    pub fn can_write_storage(&self) -> bool {
        self.state.borrow().room.can_write_storage()
    }

    /// Pause history recording.
    #[wasm_bindgen(js_name = "pauseHistory")]
    pub fn pause_history(&self) {
        self.state.borrow_mut().room.pause_history();
    }

    /// Resume history recording.
    #[wasm_bindgen(js_name = "resumeHistory")]
    pub fn resume_history(&self) {
        self.state.borrow_mut().room.resume_history();
    }

    /// Clear undo and redo stacks.
    #[wasm_bindgen(js_name = "clearHistory")]
    pub fn clear_history(&self) {
        self.state.borrow_mut().room.clear_history();
    }

    /// Get the undo stack for debugging / test assertions.
    /// Returns Vec<Vec<Stackframe>> serialized to JsValue.
    #[wasm_bindgen(js_name = "getUndoStack")]
    pub fn get_undo_stack(&self) -> JsValue {
        let state = self.state.borrow();
        let stack = state.room.storage_engine().get_undo_stack();
        stack.serialize(&serde_wasm_bindgen::Serializer::json_compatible())
            .unwrap_or(JsValue::NULL)
    }

    // -- Events --

    /// Broadcast a custom event to all clients.
    #[wasm_bindgen(js_name = "broadcastEvent")]
    pub fn broadcast_event(&self, event: JsValue) -> Result<(), JsValue> {
        let json: JsonValue = serde_wasm_bindgen::from_value(event)
            .map_err(|e| JsValue::from_str(&format!("Invalid event: {e}")))?;
        self.state.borrow_mut().room.broadcast_event(json);
        Ok(())
    }

    /// Subscribe to room events.
    /// Returns a function that unsubscribes when called.
    pub fn subscribe(
        &self,
        event_type: &str,
        callback: js_sys::Function,
    ) -> js_sys::Function {
        let sub_id = {
            let mut state = self.state.borrow_mut();
            let id = state.next_sub_id;
            state.next_sub_id += 1;
            state.subscriptions.push(Subscription {
                event_type: event_type.to_string(),
                callback,
                id,
            });
            id
        };

        // Return an unsubscribe function
        let state = Rc::clone(&self.state);
        let unsubscribe = Closure::<dyn FnMut()>::new(move || {
            state
                .borrow_mut()
                .subscriptions
                .retain(|s| s.id != sub_id);
        });
        let func = unsubscribe.as_ref().unchecked_ref::<js_sys::Function>().clone();
        unsubscribe.forget();
        func
    }

    // -- Batch --

    /// Execute a batch of mutations.
    pub fn batch(&self, callback: js_sys::Function) -> Result<(), JsValue> {
        // We need to split the borrow: call into JS from the batch closure
        // The batch method on Room takes &mut self, so we borrow mutably
        // then call the JS callback inside.
        let state = Rc::clone(&self.state);
        {
            let mut s = state.borrow_mut();
            s.room.storage_engine_mut().start_batch();
        }

        // Call the JS callback (which may call back into this RoomHandle)
        let result = callback.call0(&JsValue::NULL);

        {
            let mut s = state.borrow_mut();
            if let Some((_ops, reverse)) = s.room.storage_engine_mut().end_batch() {
                if !reverse.is_empty() {
                    s.room.storage_engine_mut().add_to_undo_stack(reverse);
                }
            }
            let can_undo = s.room.can_undo();
            let can_redo = s.room.can_redo();
            s.room.events.notify_history_change(can_undo, can_redo);
        }

        self.fire_pending_events();
        result.map(|_| ())
    }

    // -- Flush / tick --

    /// Flush outbound messages.
    pub fn flush(&self) {
        self.state.borrow_mut().room.flush();
    }

    /// Drain pending events (fire JS callbacks for any queued room events).
    /// Call this after mutations to ensure event subscribers are notified
    /// synchronously (e.g. storage-status changes).
    #[wasm_bindgen(js_name = "drainEvents")]
    pub fn drain_events(&self) {
        self.fire_pending_events();
    }

    /// Process incoming socket events and dispatch server messages.
    /// Call this from the JS event loop.
    pub fn tick(&self) {
        self.state.borrow_mut().room.process_socket_events();
        self.fire_pending_events();

        // Check for deferred timer events (from spawned timer tasks).
        // If any exist, spawn an async task to feed them back into the FSM.
        // After the deferred events are processed (e.g. reconnect completes),
        // we need to process any socket events from the new connection and
        // fire pending events + flush buffered messages.
        let has_deferred = !self
            .state
            .borrow()
            .room
            .managed_socket
            .deferred_events
            .borrow()
            .is_empty();
        if has_deferred {
            let state = Rc::clone(&self.state);
            wasm_bindgen_futures::spawn_local(async move {
                state
                    .borrow_mut()
                    .room
                    .managed_socket
                    .process_deferred_events()
                    .await;

                // After deferred events (e.g. reconnect), process any new
                // socket messages and fire events to JS subscribers.
                state.borrow_mut().room.process_socket_events();
                Self::fire_pending_events_with_state(&state);
                state.borrow_mut().room.flush();

                // The flush may have triggered loopback messages (e.g. ACK
                // from the mock server). Process those too.
                state.borrow_mut().room.process_socket_events();
                Self::fire_pending_events_with_state(&state);
            });
        }
    }

    // -- Yjs --

    /// Request Yjs document from the server.
    #[wasm_bindgen(js_name = "fetchYdoc")]
    pub fn fetch_ydoc(&self, vector: String, guid: Option<String>, v2: Option<bool>) {
        self.state.borrow_mut().room.fetch_ydoc(vector, guid, v2);
    }

    /// Send a Yjs update to the server.
    #[wasm_bindgen(js_name = "updateYdoc")]
    pub fn update_ydoc(&self, update: String, guid: Option<String>, v2: Option<bool>) {
        self.state.borrow_mut().room.update_ydoc(update, guid, v2);
    }

    // -- Document access --

    /// Get the room ID.
    #[wasm_bindgen(js_name = "getRoomId")]
    pub fn get_room_id(&self) -> String {
        self.state.borrow().room.room_id().to_string()
    }

    /// Get the actor ID (connection ID), if connected.
    #[wasm_bindgen(js_name = "getActorId")]
    pub fn get_actor_id(&self) -> JsValue {
        match self.state.borrow().room.actor_id() {
            Some(id) => JsValue::from_f64(id as f64),
            None => JsValue::NULL,
        }
    }

    // ---- Document read API (CrdtDocumentOwner-compatible) ----

    /// Get the root node ID (always "root" if storage loaded).
    #[wasm_bindgen(js_name = "getRootNodeId")]
    pub fn get_root_node_id(&self) -> JsValue {
        let state = self.state.borrow();
        match state.room.document().root() {
            Some(node) => JsValue::from_str(&node.id),
            None => JsValue::NULL,
        }
    }

    /// Get the number of nodes in the document, matching JS pool.nodes.size.
    ///
    /// In the JS room, LiveObject scalar properties are stored inline (not as
    /// separate pool nodes). The Rust model stores them as register children.
    /// To match JS nodeCount, we subtract register children of LiveObject nodes.
    #[wasm_bindgen(js_name = "getNodeCount")]
    pub fn get_node_count(&self) -> usize {
        let state = self.state.borrow();
        let doc = state.room.document();
        let total = doc.len();

        // Count register children of LiveObject nodes (these are "inline"
        // in the JS model and not counted in pool.nodes.size).
        let mut inline_registers = 0usize;
        for (_key, node) in doc.arena.iter() {
            if let CrdtData::Object { children, .. } = &node.data {
                for child_key in children.values() {
                    if let Some(child) = doc.arena.get(*child_key) {
                        if matches!(&child.data, CrdtData::Register { .. }) {
                            inline_registers += 1;
                        }
                    }
                }
            }
        }

        total.saturating_sub(inline_registers)
    }

    /// Get the node type for a given node ID.
    #[wasm_bindgen(js_name = "getNodeType")]
    pub fn get_node_type(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        match doc.get_node_by_id(node_id) {
            Some(node) => {
                let type_str = match node.node_type {
                    CrdtType::Object => "LiveObject",
                    CrdtType::List => "LiveList",
                    CrdtType::Map => "LiveMap",
                    CrdtType::Register => "Register",
                };
                JsValue::from_str(type_str)
            }
            None => JsValue::UNDEFINED,
        }
    }

    /// Get parent info for a node: { parentId, parentKey } or undefined.
    #[wasm_bindgen(js_name = "getParentInfo")]
    pub fn get_parent_info(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        match doc.get_node_by_id(node_id) {
            Some(node) => {
                if let (Some(pid), Some(pkey)) = (&node.parent_id, &node.parent_key) {
                    let obj = js_sys::Object::new();
                    js_sys::Reflect::set(&obj, &"parentId".into(), &JsValue::from_str(pid)).ok();
                    js_sys::Reflect::set(&obj, &"parentKey".into(), &JsValue::from_str(pkey)).ok();
                    obj.into()
                } else {
                    JsValue::UNDEFINED
                }
            }
            None => JsValue::UNDEFINED,
        }
    }

    // -- Object reads --

    #[wasm_bindgen(js_name = "objectGetEntry")]
    pub fn object_get_entry(&self, node_id: &str, key: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        // Get child at this key
        match object::get_child(doc, node_key, key) {
            Some(child_key) => build_entry_js(doc, child_key),
            None => JsValue::UNDEFINED,
        }
    }

    #[wasm_bindgen(js_name = "objectKeys")]
    pub fn object_keys(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return js_sys::Array::new().into();
        };
        let keys = object::keys(doc, node_key);
        let arr = js_sys::Array::new();
        for k in keys {
            arr.push(&JsValue::from_str(&k));
        }
        arr.into()
    }

    #[wasm_bindgen(js_name = "objectEntries")]
    pub fn object_entries(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return js_sys::Array::new().into();
        };
        let node = match doc.get_node(node_key) {
            Some(n) => n,
            None => return js_sys::Array::new().into(),
        };
        let arr = js_sys::Array::new();
        if let CrdtData::Object { children, .. } = &node.data {
            for (key, child_key) in children {
                let entry_arr = js_sys::Array::new();
                entry_arr.push(&JsValue::from_str(key));
                entry_arr.push(&build_entry_js(doc, *child_key));
                arr.push(&entry_arr);
            }
        }
        arr.into()
    }

    #[wasm_bindgen(js_name = "objectToImmutable")]
    pub fn object_to_immutable(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        match object::to_immutable(doc, node_key) {
            Some(json) => json_to_jsvalue(&json),
            None => JsValue::UNDEFINED,
        }
    }

    // -- List reads --

    #[wasm_bindgen(js_name = "listLength")]
    pub fn list_length(&self, node_id: &str) -> usize {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return 0;
        };
        list::length(doc, node_key)
    }

    #[wasm_bindgen(js_name = "listGetEntry")]
    pub fn list_get_entry(&self, node_id: &str, index: usize) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        match list::get_child_key(doc, node_key, index) {
            Some(child_key) => build_entry_js(doc, child_key),
            None => JsValue::UNDEFINED,
        }
    }

    #[wasm_bindgen(js_name = "listEntries")]
    pub fn list_entries(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return js_sys::Array::new().into();
        };
        let len = list::length(doc, node_key);
        let arr = js_sys::Array::new();
        for i in 0..len {
            if let Some(child_key) = list::get_child_key(doc, node_key, i) {
                arr.push(&build_entry_js(doc, child_key));
            }
        }
        arr.into()
    }

    #[wasm_bindgen(js_name = "listToImmutable")]
    pub fn list_to_immutable(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        match list::to_immutable(doc, node_key) {
            Some(json) => json_to_jsvalue(&json),
            None => JsValue::UNDEFINED,
        }
    }

    // -- Map reads --

    #[wasm_bindgen(js_name = "mapGetEntry")]
    pub fn map_get_entry(&self, node_id: &str, key: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        match map::get_child(doc, node_key, key) {
            Some(child_key) => build_entry_js(doc, child_key),
            None => JsValue::UNDEFINED,
        }
    }

    #[wasm_bindgen(js_name = "mapHas")]
    pub fn map_has(&self, node_id: &str, key: &str) -> bool {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return false;
        };
        map::has(doc, node_key, key)
    }

    #[wasm_bindgen(js_name = "mapSize")]
    pub fn map_size(&self, node_id: &str) -> usize {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return 0;
        };
        map::size(doc, node_key)
    }

    #[wasm_bindgen(js_name = "mapKeys")]
    pub fn map_keys(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        let keys = map::keys(doc, node_key);
        let arr = js_sys::Array::new();
        for k in keys {
            arr.push(&JsValue::from_str(&k));
        }
        arr.into()
    }

    #[wasm_bindgen(js_name = "mapEntries")]
    pub fn map_entries(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return js_sys::Array::new().into();
        };
        let node = match doc.get_node(node_key) {
            Some(n) => n,
            None => return js_sys::Array::new().into(),
        };
        let arr = js_sys::Array::new();
        if let CrdtData::Map { children, .. } = &node.data {
            for (key, child_key) in children {
                let entry_arr = js_sys::Array::new();
                entry_arr.push(&JsValue::from_str(key));
                entry_arr.push(&build_entry_js(doc, *child_key));
                arr.push(&entry_arr);
            }
        }
        arr.into()
    }

    #[wasm_bindgen(js_name = "mapToImmutable")]
    pub fn map_to_immutable(&self, node_id: &str) -> JsValue {
        let state = self.state.borrow();
        let doc = state.room.document();
        let Some(node_key) = doc.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        match map::to_immutable(doc, node_key) {
            Some(json) => json_to_jsvalue(&json),
            None => JsValue::UNDEFINED,
        }
    }

    // ---- Document write API ----

    /// Update an object node with a patch of key-value pairs.
    ///
    /// For scalar values: creates register children + UpdateObject op.
    /// For nested objects/arrays: creates proper LiveObject/LiveList subtrees
    /// with CreateObject/CreateList/CreateRegister ops.
    #[wasm_bindgen(js_name = "objectUpdate")]
    pub fn object_update(&self, node_id: &str, data: JsValue) -> JsValue {
        let patch: std::collections::BTreeMap<String, Json> =
            match serde_wasm_bindgen::from_value(data) {
                Ok(m) => m,
                Err(_) => return JsValue::UNDEFINED,
            };
        if patch.is_empty() {
            return JsValue::UNDEFINED;
        }

        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        let nid = node_id.to_string();

        // Split patch into scalar and nested values
        let mut scalar_patch = std::collections::BTreeMap::new();
        let mut nested_patch: Vec<(String, Json)> = Vec::new();
        for (key, value) in &patch {
            match value {
                Json::Object(_) | Json::Array(_) => {
                    nested_patch.push((key.clone(), value.clone()));
                }
                _ => {
                    scalar_patch.insert(key.clone(), value.clone());
                }
            }
        }

        // Capture old values for reverse.
        // For scalar keys: if old value is a plain scalar, capture UpdateObject reverse.
        // If old value is a CRDT child, capture recreate ops for the subtree.
        let mut reverse_data = std::collections::BTreeMap::new();
        let mut reverse_deletes_scalar = Vec::new();
        let mut reverse_ops_for_replaced_crdt = Vec::new();
        // Track scalar keys that replace existing CRDT children — need to remove old child
        let mut scalar_keys_replacing_crdt: Vec<String> = Vec::new();
        for key in scalar_patch.keys() {
            if let Some(old_val) = object::get_plain(&room.document, node_key, key) {
                reverse_data.insert(key.clone(), old_val.clone());
            } else if let Some(child_key) = object::get_child(&room.document, node_key, key) {
                // Key currently holds a CRDT child — capture recreate ops
                let recreate = crate::ops::apply::generate_create_ops_for_subtree(&room.document, child_key);
                reverse_ops_for_replaced_crdt.extend(recreate);
                scalar_keys_replacing_crdt.push(key.clone());
            } else {
                reverse_deletes_scalar.push(delete_object_key_op(&nid, key));
            }
        }
        // For nested keys that had existing children, capture appropriate reverse ops.
        // - Old value is scalar (register) → reverse restores it via UpdateObject
        // - Old value is CRDT child → reverse recreates the subtree via CreateObject etc.
        // - No old value → reverse deletes the new child via DeleteCrdt
        let mut reverse_ops_for_old_nested = Vec::new();
        let mut nested_reverse_data = std::collections::BTreeMap::new();
        // Keys that had no old value — need DeleteCrdt for their new children
        let mut nested_keys_no_old_value: Vec<String> = Vec::new();
        for (key, _) in &nested_patch {
            if let Some(old_val) = object::get_plain(&room.document, node_key, key) {
                // Old value was a scalar — reverse restores it via UpdateObject
                nested_reverse_data.insert(key.clone(), old_val.clone());
            } else if let Some(child_key) = object::get_child(&room.document, node_key, key) {
                let child = room.document.get_node(child_key);
                let is_register = child.map(|n| matches!(&n.data, CrdtData::Register { .. })).unwrap_or(false);
                if is_register {
                    // Old child is a register (shouldn't reach here, get_plain handles registers,
                    // but handle as scalar just in case)
                    if let Some(old_val) = child.and_then(|n| {
                        if let CrdtData::Register { data } = &n.data { Some(data.clone()) } else { None }
                    }) {
                        nested_reverse_data.insert(key.clone(), old_val);
                    }
                } else {
                    // Old value was a CRDT child — reverse recreates the subtree
                    let recreate = crate::ops::apply::generate_create_ops_for_subtree(&room.document, child_key);
                    reverse_ops_for_old_nested.extend(recreate);
                }
            } else {
                // No old value — will generate DeleteCrdt after creating the new child
                nested_keys_no_old_value.push(key.clone());
            }
        }

        // Merge all reverse scalar data (from scalar_patch and nested_patch) into one UpdateObject
        for (key, val) in nested_reverse_data {
            reverse_data.insert(key, val);
        }

        let mut reverse_ops = Vec::new();
        if !reverse_data.is_empty() {
            reverse_ops.push(update_object_op(&nid, reverse_data));
        }
        reverse_ops.extend(reverse_deletes_scalar);
        // For scalar keys replacing CRDT children, the reverse recreate ops
        // (CreateObject etc.) are sufficient — the CREATE_* op's parentId+parentKey
        // will implicitly replace whatever occupies that slot. No extra
        // DeleteObjectKey is needed (matching JS behavior).
        reverse_ops.extend(reverse_ops_for_replaced_crdt);
        reverse_ops.extend(reverse_ops_for_old_nested);

        let mut all_fwd_ops = Vec::new();

        // Always generate an opId speculatively (matching JS LiveObject.update behavior).
        // In JS, generateOpId() is called at the start of _update() even for nested-only
        // patches. This ensures downstream nested ops get correctly offset opIds.
        let base_op_id = room.id_gen.generate_op_id();

        // Handle scalar values: UpdateObject op + register children
        if !scalar_patch.is_empty() {
            // Remove any existing CRDT children that are being replaced by scalars
            for key in &scalar_keys_replacing_crdt {
                object::remove_child_at_key_pub(&mut room.document, node_key, key);
            }

            let mut fwd_op = update_object_op(&nid, scalar_patch.clone());
            fwd_op.op_id = Some(base_op_id.clone());
            all_fwd_ops.push(fwd_op);

            for (key, value) in &scalar_patch {
                object::set_plain(&mut room.document, node_key, key, value.clone());
                object::set_unacked_op(&mut room.document, node_key, key, base_op_id.clone());
            }
        }

        // Handle nested values: deep-create proper CRDT subtrees
        for (key, value) in &nested_patch {
            use crate::crdt::deep;

            // Remove old child at this key
            object::remove_child_at_key_pub(&mut room.document, node_key, key);

            let result = deep::deep_create_value(
                &mut room.document,
                &mut room.id_gen,
                &nid,
                key,
                value,
            );

            // For keys that had NO old value, generate reverse ops for each
            // forward op. This ensures the undo stack is stable through undo-redo
            // cycles. For the top-level CREATE at an Object parent, this
            // generates DELETE_OBJECT_KEY; for inner nodes, DELETE_CRDT.
            if nested_keys_no_old_value.contains(key) {
                use crate::ops::reverse::compute_reverse_ops;
                for fwd_op in result.ops.iter().rev() {
                    let rev = compute_reverse_ops(&room.document, fwd_op);
                    reverse_ops.extend(rev);
                }
            }

            // Attach new child to parent object
            if let Some(node) = room.document.get_node_mut(node_key)
                && let CrdtData::Object { children, .. } = &mut node.data
            {
                children.insert(key.clone(), result.node_key);
            }

            all_fwd_ops.extend(result.ops);
        }

        // Track undo + send
        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(all_fwd_ops);

        JsValue::UNDEFINED
    }

    /// Delete a key from an object node. Returns true if the key existed.
    #[wasm_bindgen(js_name = "objectDelete")]
    pub fn object_delete(&self, node_id: &str, key: &str) -> bool {
        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return false;
        };

        // Check if the key exists (as a child node)
        let has_key = object::get_child(&room.document, node_key, key).is_some();
        if !has_key {
            return false;
        }

        let nid = node_id.to_string();
        let reverse_ops = if let Some(old_val) = object::get_plain(&room.document, node_key, key) {
            let mut data = std::collections::BTreeMap::new();
            data.insert(key.to_string(), old_val.clone());
            vec![update_object_op(&nid, data)]
        } else {
            // Key exists as a CRDT child (not a plain value) — generate recreate ops
            if let Some(child_key) = object::get_child(&room.document, node_key, key) {
                crate::ops::apply::generate_create_ops_for_subtree(&room.document, child_key)
            } else {
                vec![]
            }
        };

        object::delete_key(&mut room.document, node_key, key);

        let op = delete_object_key_op(&nid, key);

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(vec![op]);

        true
    }

    /// Push an element to the end of a list.
    #[wasm_bindgen(js_name = "listPush")]
    pub fn list_push(&self, node_id: &str, value: JsValue) -> JsValue {
        let json: Json = match serde_wasm_bindgen::from_value(value) {
            Ok(v) => v,
            Err(_) => return JsValue::UNDEFINED,
        };

        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        let nid = node_id.to_string();

        // Compute the position for the new item (after the last existing item)
        let position = {
            let node = room.document.get_node(node_key);
            let last_pos = node.and_then(|n| match &n.data {
                CrdtData::List { children, .. } => children.last().map(|(p, _)| p.clone()),
                _ => None,
            });
            match last_pos {
                Some(p) => crate::position::after(&p),
                None => crate::position::make_position(None, None),
            }
        };

        // Generate ops without creating nodes in arena — let apply_op handle it
        use crate::crdt::deep;
        let ops = deep::deep_generate_ops(
            &mut room.id_gen,
            &nid,
            &position,
            &json,
        );

        // Compute reverse ops BEFORE applying (nodes don't exist yet, so
        // reverse_create will see no existing child at the parent key → DeleteCrdt)
        use crate::ops::reverse::compute_reverse_ops;
        let mut reverse_ops = Vec::new();
        for fwd_op in ops.iter().rev() {
            reverse_ops.extend(compute_reverse_ops(&room.document, fwd_op));
        }

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(ops);

        JsValue::UNDEFINED
    }

    /// Insert an element at an index in a list.
    #[wasm_bindgen(js_name = "listInsert")]
    pub fn list_insert(&self, node_id: &str, value: JsValue, index: usize) -> JsValue {
        let json: Json = match serde_wasm_bindgen::from_value(value) {
            Ok(v) => v,
            Err(_) => return JsValue::UNDEFINED,
        };

        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        let nid = node_id.to_string();

        // Compute position between the items at (index-1) and (index)
        let position = {
            let node = room.document.get_node(node_key);
            let children_len = node.map(|n| match &n.data {
                CrdtData::List { children, .. } => children.len(),
                _ => 0,
            }).unwrap_or(0);
            let before = if index > 0 {
                node.and_then(|n| match &n.data {
                    CrdtData::List { children, .. } => children.get(index - 1).map(|(p, _)| p.as_str()),
                    _ => None,
                })
            } else {
                None
            };
            let after = if index < children_len {
                node.and_then(|n| match &n.data {
                    CrdtData::List { children, .. } => children.get(index).map(|(p, _)| p.as_str()),
                    _ => None,
                })
            } else {
                None
            };
            crate::position::make_position(before, after)
        };

        // Generate ops without creating nodes — let apply_op handle it
        use crate::crdt::deep;
        let ops = deep::deep_generate_ops(
            &mut room.id_gen,
            &nid,
            &position,
            &json,
        );

        use crate::ops::reverse::compute_reverse_ops;
        let mut reverse_ops = Vec::new();
        for fwd_op in ops.iter().rev() {
            reverse_ops.extend(compute_reverse_ops(&room.document, fwd_op));
        }

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(ops);

        JsValue::UNDEFINED
    }

    /// Move an element within a list.
    #[wasm_bindgen(js_name = "listMove")]
    pub fn list_move(&self, node_id: &str, from: usize, to: usize) -> JsValue {
        if from == to {
            return JsValue::UNDEFINED;
        }

        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };

        let op_id = room.id_gen.generate_op_id();

        // Capture element info before move
        let (elem_id, old_position) = match list::get_child_key(&room.document, node_key, from) {
            Some(ck) => {
                let node = room.document.get_node(ck);
                let id = node.map(|n| n.id.clone()).unwrap_or_default();
                let pkey = node.and_then(|n| n.parent_key.clone()).unwrap_or_default();
                (id, pkey)
            }
            None => return JsValue::UNDEFINED,
        };

        // Compute the new position without mutating — let apply_op handle mutation
        let new_position = match list::compute_move_position(&room.document, node_key, from, to) {
            Some(p) => p,
            None => return JsValue::UNDEFINED,
        };

        let mut op = set_parent_key_op(&elem_id, &new_position);
        op.op_id = Some(op_id);

        let reverse_ops = vec![set_parent_key_op(&elem_id, &old_position)];

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(vec![op]);

        JsValue::UNDEFINED
    }

    /// Delete an element from a list by index.
    #[wasm_bindgen(js_name = "listDelete")]
    pub fn list_delete(&self, node_id: &str, index: usize) -> JsValue {
        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };

        let (elem_id, reverse_ops) = match list::get_child_key(&room.document, node_key, index) {
            Some(ck) => {
                let id = room.document.get_node(ck).map(|n| n.id.clone()).unwrap_or_default();
                let rev = crate::ops::apply::generate_create_ops_for_subtree(&room.document, ck);
                (id, rev)
            }
            None => return JsValue::UNDEFINED,
        };

        let op_id = room.id_gen.generate_op_id();
        // Don't pre-delete — let apply_op handle removal and update generation
        let mut op = delete_crdt_op(&elem_id);
        op.op_id = Some(op_id);

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(vec![op]);

        JsValue::UNDEFINED
    }

    /// Set an element at a specific index in a list.
    #[wasm_bindgen(js_name = "listSet")]
    pub fn list_set(&self, node_id: &str, index: usize, value: JsValue) -> JsValue {
        let json: Json = match serde_wasm_bindgen::from_value(value) {
            Ok(v) => v,
            Err(_) => return JsValue::UNDEFINED,
        };

        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        let nid = node_id.to_string();

        // Capture the old item's node ID and reverse ops before modification
        let (old_node_id, old_recreate_ops) = match list::get_child_key(&room.document, node_key, index) {
            Some(ck) => {
                let old_id = room.document.get_node(ck).map(|n| n.id.clone());
                let recreate = crate::ops::apply::generate_create_ops_for_subtree(&room.document, ck);
                (old_id, recreate)
            }
            None => (None, vec![]),
        };

        // Get the position of the item being replaced
        let position = list::get_position(&room.document, node_key, index)
            .unwrap_or_default();

        // Generate ops without creating nodes — let apply_op handle it
        use crate::crdt::deep;
        let mut ops = deep::deep_generate_ops(
            &mut room.id_gen,
            &nid,
            &position,
            &json,
        );

        // Mark all ops with set intent so apply_op knows to replace existing child.
        // Set deleted_id on the first op to the old item's ID so apply_op removes
        // the old node from the arena (not just implicitly deletes it).
        for (i, op) in ops.iter_mut().enumerate() {
            op.intent = Some("set".to_string());
            if i == 0 {
                op.deleted_id = old_node_id.clone();
            }
        }

        // Compute reverse ops BEFORE applying (nodes don't exist yet)
        use crate::ops::reverse::compute_reverse_ops;
        let mut reverse_ops = Vec::new();
        for fwd_op in ops.iter().rev() {
            reverse_ops.extend(compute_reverse_ops(&room.document, fwd_op));
        }
        reverse_ops.extend(old_recreate_ops);

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(ops);

        JsValue::UNDEFINED
    }

    /// Clear all elements from a list.
    #[wasm_bindgen(js_name = "listClear")]
    pub fn list_clear(&self, node_id: &str) -> JsValue {
        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };

        let len = list::length(&room.document, node_key);
        if len == 0 {
            return JsValue::UNDEFINED;
        }

        // Capture reverse ops and generate delete ops for each child in forward order.
        // Forward order ensures StorageUpdate entries match JS behavior (always index 0).
        // Don't pre-clear — let apply_op handle removal and update generation.
        let mut ops = Vec::new();
        let mut reverse_ops = Vec::new();
        for i in 0..len {
            if let Some(ck) = list::get_child_key(&room.document, node_key, i) {
                let elem_id = room.document.get_node(ck).map(|n| n.id.clone()).unwrap_or_default();
                reverse_ops.extend(crate::ops::apply::generate_create_ops_for_subtree(&room.document, ck));
                let op_id = room.id_gen.generate_op_id();
                let mut op = delete_crdt_op(&elem_id);
                op.op_id = Some(op_id);
                ops.push(op);
            }
        }

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(ops);

        JsValue::UNDEFINED
    }

    /// Set a key-value pair on a map node.
    #[wasm_bindgen(js_name = "mapSet")]
    pub fn map_set(&self, node_id: &str, key: &str, value: JsValue) -> JsValue {
        let json: Json = match serde_wasm_bindgen::from_value(value) {
            Ok(v) => v,
            Err(_) => return JsValue::UNDEFINED,
        };

        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return JsValue::UNDEFINED;
        };
        let nid = node_id.to_string();

        // Determine if the value is a nested CRDT type (object, array, LiveMap marker)
        let is_nested = matches!(&json, Json::Object(_) | Json::Array(_));

        if is_nested {
            use crate::crdt::deep;
            use crate::ops::reverse::compute_reverse_ops;

            // Generate ops without creating nodes — let apply_op handle it
            let ops = deep::deep_generate_ops(
                &mut room.id_gen,
                &nid,
                key,
                &json,
            );

            // compute_reverse_ops handles old value capture via reverse_create's
            // Map parent branch — no separate old_recreate_ops needed
            let mut reverse_ops = Vec::new();
            for fwd_op in ops.iter().rev() {
                let rev = compute_reverse_ops(&room.document, fwd_op);
                reverse_ops.extend(rev);
            }

            use crate::room_engine::Stackframe;
            let undo_frames: Vec<Stackframe> =
                reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
            if room.storage_engine.is_batching() {
                room.storage_engine.batch_add_reverse(undo_frames);
            } else {
                room.storage_engine.on_dispatch_outside_batch(undo_frames);
            }
            room.apply_local_ops(ops);
        } else {
            // Scalar value — generate a register op without pre-creating
            use crate::ops::reverse::compute_reverse_ops;
            let reg_id = room.id_gen.generate_id();
            let op_id = room.id_gen.generate_op_id();

            let mut op = create_register_op(&reg_id, &nid, key, json);
            op.op_id = Some(op_id);

            // compute_reverse_ops handles old value capture via reverse_create's
            // Map parent branch — no separate old_recreate_ops needed
            let mut reverse_ops = Vec::new();
            reverse_ops.extend(compute_reverse_ops(&room.document, &op));

            use crate::room_engine::Stackframe;
            let undo_frames: Vec<Stackframe> =
                reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
            if room.storage_engine.is_batching() {
                room.storage_engine.batch_add_reverse(undo_frames);
            } else {
                room.storage_engine.on_dispatch_outside_batch(undo_frames);
            }
            room.apply_local_ops(vec![op]);
        }

        JsValue::UNDEFINED
    }

    /// Delete a key from a map node.
    #[wasm_bindgen(js_name = "mapDelete")]
    pub fn map_delete(&self, node_id: &str, key: &str) -> bool {
        let mut state = self.state.borrow_mut();
        let room = &mut state.room;
        let Some(node_key) = room.document.get_key_by_id(node_id) else {
            return false;
        };

        let (elem_id, reverse_ops) = match map::get_child(&room.document, node_key, key) {
            Some(ck) => {
                let id = room.document.get_node(ck).map(|n| n.id.clone()).unwrap_or_default();
                let rev = crate::ops::apply::generate_create_ops_for_subtree(&room.document, ck);
                (id, rev)
            }
            None => return false,
        };

        let op_id = room.id_gen.generate_op_id();
        // Don't pre-delete — let apply_op handle removal and update generation
        let mut op = delete_crdt_op(&elem_id);
        op.op_id = Some(op_id);

        use crate::room_engine::Stackframe;
        let undo_frames: Vec<Stackframe> = reverse_ops.iter().map(|op| Stackframe::StorageOp(op.clone())).collect();
        if room.storage_engine.is_batching() {
            room.storage_engine.batch_add_reverse(undo_frames);
        } else {
            room.storage_engine.on_dispatch_outside_batch(undo_frames);
        }
        room.apply_local_ops(vec![op]);

        true
    }
}

// Non-wasm_bindgen methods
impl RoomHandle {
    /// Fire all pending events to subscribed callbacks.
    fn fire_pending_events(&self) {
        Self::fire_pending_events_with_state(&self.state);
    }

    /// Static version of fire_pending_events, usable from async tasks.
    fn fire_pending_events_with_state(state: &Rc<RefCell<RoomState>>) {
        let events = state.borrow_mut().room.events.take_events();

        for event in &events {
            let (event_type, event_data) = match event {
                RoomEvent::StatusChanged(status) => {
                    ("status", JsValue::from_str(status.as_str()))
                }
                RoomEvent::MyPresenceChanged(presence) => (
                    "my-presence",
                    presence.serialize(&serde_wasm_bindgen::Serializer::json_compatible())
                        .unwrap_or(JsValue::UNDEFINED),
                ),
                RoomEvent::OthersChanged(others) => (
                    "others",
                    others.serialize(&serde_wasm_bindgen::Serializer::json_compatible())
                        .unwrap_or(JsValue::UNDEFINED),
                ),
                RoomEvent::StorageChanged { updates, .. } => {
                    if updates.is_empty() {
                        ("storage", JsValue::UNDEFINED)
                    } else {
                        let serialized = updates.serialize(
                            &serde_wasm_bindgen::Serializer::json_compatible()
                        ).unwrap_or(JsValue::UNDEFINED);
                        ("storage", serialized)
                    }
                }
                RoomEvent::StorageLoaded => ("storage-loaded", JsValue::UNDEFINED),
                RoomEvent::StorageStatusChanged(status) => {
                    ("storage-status", JsValue::from_str(status))
                }
                RoomEvent::CustomEvent {
                    connection_id,
                    event,
                } => {
                    let mut obj = serde_json::Map::new();
                    obj.insert(
                        "connectionId".to_string(),
                        JsonValue::from(*connection_id),
                    );
                    obj.insert("event".to_string(), event.clone());
                    (
                        "event",
                        JsonValue::Object(obj).serialize(
                            &serde_wasm_bindgen::Serializer::json_compatible()
                        ).unwrap_or(JsValue::UNDEFINED),
                    )
                }
                RoomEvent::HistoryChanged {
                    can_undo,
                    can_redo,
                } => {
                    let mut obj = serde_json::Map::new();
                    obj.insert("canUndo".to_string(), JsonValue::from(*can_undo));
                    obj.insert("canRedo".to_string(), JsonValue::from(*can_redo));
                    (
                        "history",
                        JsonValue::Object(obj).serialize(
                            &serde_wasm_bindgen::Serializer::json_compatible()
                        ).unwrap_or(JsValue::UNDEFINED),
                    )
                }
                RoomEvent::Error { message, code } => {
                    let mut obj = serde_json::Map::new();
                    obj.insert("message".to_string(), JsonValue::from(message.clone()));
                    obj.insert("code".to_string(), JsonValue::from(*code));
                    (
                        "error",
                        JsonValue::Object(obj).serialize(
                            &serde_wasm_bindgen::Serializer::json_compatible()
                        ).unwrap_or(JsValue::UNDEFINED),
                    )
                }
                RoomEvent::LostConnection(detail) => {
                    ("lost-connection", JsValue::from_str(detail))
                }
                RoomEvent::YdocUpdate { .. } => ("ydoc", JsValue::UNDEFINED),
            };

            // Fire callbacks for this event type
            let borrowed = state.borrow();
            for sub in &borrowed.subscriptions {
                if sub.event_type == event_type || sub.event_type == "*" {
                    let _ = sub.callback.call1(&JsValue::NULL, &event_data);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Document entry helpers
// ---------------------------------------------------------------------------

use crate::arena::NodeKey;
use crate::document::Document;

/// Build a CrdtEntry-shaped JS object from a child node.
/// Returns `{ type: "scalar", value: <json> }` for Registers,
/// or `{ type: "node", nodeId: <string>, nodeType: <string> }` for CRDT children.
fn build_entry_js(doc: &Document, child_key: NodeKey) -> JsValue {
    let Some(child) = doc.get_node(child_key) else {
        return JsValue::UNDEFINED;
    };
    let obj = js_sys::Object::new();
    match &child.data {
        CrdtData::Register { data } => {
            let _ = js_sys::Reflect::set(&obj, &"type".into(), &"scalar".into());
            let _ = js_sys::Reflect::set(&obj, &"value".into(), &json_to_jsvalue(data));
        }
        _ => {
            let _ = js_sys::Reflect::set(&obj, &"type".into(), &"node".into());
            let _ = js_sys::Reflect::set(
                &obj,
                &"nodeId".into(),
                &JsValue::from_str(&child.id),
            );
            let node_type_str = match child.node_type {
                CrdtType::Object => "LiveObject",
                CrdtType::List => "LiveList",
                CrdtType::Map => "LiveMap",
                CrdtType::Register => "Register",
            };
            let _ = js_sys::Reflect::set(
                &obj,
                &"nodeType".into(),
                &JsValue::from_str(node_type_str),
            );
        }
    }
    obj.into()
}

/// Convert an internal Json value to a JsValue.
fn json_to_jsvalue(json: &Json) -> JsValue {
    match json {
        Json::Null => JsValue::NULL,
        Json::Bool(b) => JsValue::from_bool(*b),
        Json::Number(n) => JsValue::from_f64(*n),
        Json::String(s) => JsValue::from_str(s),
        _ => {
            use serde::Serialize;
            let serializer = serde_wasm_bindgen::Serializer::new()
                .serialize_maps_as_objects(true)
                .serialize_missing_as_null(true);
            json.serialize(&serializer).unwrap_or(JsValue::UNDEFINED)
        }
    }
}

// ---------------------------------------------------------------------------
// Helper functions for JS object property access
// ---------------------------------------------------------------------------

fn get_js_value(obj: &JsValue, key: &str) -> Option<JsValue> {
    js_sys::Reflect::get(obj, &JsValue::from_str(key))
        .ok()
        .filter(|v| !v.is_undefined() && !v.is_null())
}

fn get_string(obj: &JsValue, key: &str) -> Option<String> {
    get_js_value(obj, key).and_then(|v| v.as_string())
}

fn get_number(obj: &JsValue, key: &str) -> Option<f64> {
    get_js_value(obj, key).and_then(|v| v.as_f64())
}
