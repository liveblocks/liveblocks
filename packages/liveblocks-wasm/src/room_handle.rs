//! WASM-bindgen RoomHandle: exports the full Rust Room to JavaScript.
//!
//! The RoomHandle wraps Room<JsDelegateConnector, WasmHttpClient> and exposes
//! every Room operation via wasm-bindgen. JS delegates for auth and socket
//! creation are wrapped in WASM platform adapters.

use std::cell::RefCell;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;

use serde_json::Value as JsonValue;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::connection::managed_socket::{AuthEndpoint, Delegates, ManagedSocket};
use crate::platform::{
    HttpMethod, HttpRequest, HttpResponse, HttpClient, Timer, WebSocket,
    WebSocketConnector, WsEvent, WsEventReceiver,
};
use crate::room::events::RoomEvent;
use crate::room::Room;

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

            // Hook into JS WebSocket events: onopen, onmessage, onclose, onerror
            {
                let tx_open = tx.clone();
                let onopen = Closure::<dyn FnMut()>::new(move || {
                    let _ = tx_open.unbounded_send(WsEvent::Open);
                });
                js_sys::Reflect::set(
                    &ws_instance,
                    &JsValue::from_str("onopen"),
                    onopen.as_ref(),
                )
                .map_err(|_| "Failed to set onopen".to_string())?;
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
                js_sys::Reflect::set(
                    &ws_instance,
                    &JsValue::from_str("onmessage"),
                    onmessage.as_ref(),
                )
                .map_err(|_| "Failed to set onmessage".to_string())?;
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
                js_sys::Reflect::set(
                    &ws_instance,
                    &JsValue::from_str("onclose"),
                    onclose.as_ref(),
                )
                .map_err(|_| "Failed to set onclose".to_string())?;
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
                js_sys::Reflect::set(
                    &ws_instance,
                    &JsValue::from_str("onerror"),
                    onerror.as_ref(),
                )
                .map_err(|_| "Failed to set onerror".to_string())?;
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

        Ok(RoomHandle {
            state: Rc::new(RefCell::new(RoomState {
                room,
                subscriptions: Vec::new(),
                next_sub_id: 1,
            })),
        })
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
        format!("{:?}", state.room.status())
    }

    // -- Presence --

    /// Get the local user's presence.
    #[wasm_bindgen(js_name = "getPresence")]
    pub fn get_presence(&self) -> JsValue {
        let state = self.state.borrow();
        let presence = state.room.presence().my_presence();
        serde_wasm_bindgen::to_value(presence).unwrap_or(JsValue::UNDEFINED)
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
        serde_wasm_bindgen::to_value(&others).unwrap_or(JsValue::UNDEFINED)
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
            serde_wasm_bindgen::to_value(&JsonValue::Object(obj))
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

    /// Get the current storage status.
    #[wasm_bindgen(js_name = "getStorageStatus")]
    pub fn get_storage_status(&self) -> String {
        let state = self.state.borrow();
        format!("{:?}", state.room.storage_status())
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
            let _ = s.room.storage_engine_mut().end_batch();
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

    /// Process incoming socket events and dispatch server messages.
    /// Call this from the JS event loop.
    pub fn tick(&self) {
        self.state.borrow_mut().room.process_socket_events();
        self.fire_pending_events();
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
}

// Non-wasm_bindgen methods
impl RoomHandle {
    /// Fire all pending events to subscribed callbacks.
    fn fire_pending_events(&self) {
        let events = self.state.borrow_mut().room.events.take_events();

        for event in &events {
            let (event_type, event_data) = match event {
                RoomEvent::StatusChanged(status) => {
                    ("status", JsValue::from_str(&format!("{:?}", status)))
                }
                RoomEvent::MyPresenceChanged(presence) => (
                    "my-presence",
                    serde_wasm_bindgen::to_value(presence).unwrap_or(JsValue::UNDEFINED),
                ),
                RoomEvent::OthersChanged(others) => (
                    "others",
                    serde_wasm_bindgen::to_value(others).unwrap_or(JsValue::UNDEFINED),
                ),
                RoomEvent::StorageChanged => ("storage", JsValue::UNDEFINED),
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
                        serde_wasm_bindgen::to_value(&JsonValue::Object(obj))
                            .unwrap_or(JsValue::UNDEFINED),
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
                        serde_wasm_bindgen::to_value(&JsonValue::Object(obj))
                            .unwrap_or(JsValue::UNDEFINED),
                    )
                }
                RoomEvent::Error { message, code } => {
                    let mut obj = serde_json::Map::new();
                    obj.insert("message".to_string(), JsonValue::from(message.clone()));
                    obj.insert("code".to_string(), JsonValue::from(*code));
                    (
                        "error",
                        serde_wasm_bindgen::to_value(&JsonValue::Object(obj))
                            .unwrap_or(JsValue::UNDEFINED),
                    )
                }
                RoomEvent::LostConnection(detail) => {
                    ("lost-connection", JsValue::from_str(detail))
                }
                RoomEvent::YdocUpdate { .. } => ("ydoc", JsValue::UNDEFINED),
            };

            // Fire callbacks for this event type
            let state = self.state.borrow();
            for sub in &state.subscriptions {
                if sub.event_type == event_type || sub.event_type == "*" {
                    let _ = sub.callback.call1(&JsValue::NULL, &event_data);
                }
            }
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
