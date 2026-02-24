//! ManagedSocket: the async loop that drives the connection FSM.
//!
//! The FSM itself is a pure state machine with no I/O. This module
//! wraps it with actual I/O by interpreting `Effect`s and feeding
//! `ConnEvent`s back into the machine.

use std::cell::RefCell;
use std::rc::Rc;

use crate::auth::{AuthManager, AuthValue};
use crate::auth::token::parse_auth_token;
use crate::connection::fsm::{ConnEvent, ConnFsm, Effect, Status};
use crate::platform::{
    HttpClient, HttpMethod, HttpRequest, Timer, WebSocket, WebSocketConnector, WsEvent,
    WsEventReceiver,
};

/// Delegates provided by the caller for auth and socket creation.
pub struct Delegates<C: WebSocketConnector, H: HttpClient> {
    pub connector: C,
    pub http_client: H,
    pub timer: Box<dyn Timer>,
    pub auth_endpoint: AuthEndpoint,
}

/// How to authenticate.
#[derive(Debug, Clone)]
pub enum AuthEndpoint {
    /// Use a public API key directly.
    PublicKey(String),
    /// POST to an auth endpoint to get a token.
    PrivateEndpoint { url: String },
}

/// Messages emitted by the managed socket to the Room layer.
#[derive(Debug)]
pub enum ManagedSocketEvent {
    /// Connection status changed.
    StatusDidChange(Status),
    /// An incoming WebSocket text message (to be parsed as ServerMsg).
    Message(String),
    /// The socket was disconnected (either deliberately or due to error).
    Disconnected,
    /// The socket connected successfully.
    Connected,
    /// A connection-level error occurred.
    ConnectionError { message: String, code: i32 },
}

/// The managed socket wraps a ConnFsm and drives it with real I/O.
///
/// The FSM is pure and carries no I/O state. The managed socket stores
/// the current `auth_value` externally and uses it when the FSM emits
/// `Effect::StartSocketConnect`.
pub struct ManagedSocket<C: WebSocketConnector, H: HttpClient> {
    fsm: ConnFsm,
    delegates: Delegates<C, H>,
    auth_manager: AuthManager,
    auth_value: Option<AuthValue>,
    socket: Option<C::Socket>,
    receiver: Option<C::Receiver>,
    room_id: String,
    base_url: String,
    pending_events: Vec<ManagedSocketEvent>,
    /// Deferred ConnEvents from timer fires that should be processed on next tick.
    pub(crate) deferred_events: Rc<RefCell<Vec<ConnEvent>>>,
    /// Optional JS callback invoked when a deferred event is pushed.
    /// The RoomHandle sets this so the timer can trigger processing.
    #[cfg(feature = "wasm")]
    pub(crate) on_deferred_event: Option<js_sys::Function>,
}

impl<C: WebSocketConnector, H: HttpClient> ManagedSocket<C, H> {
    pub fn new(
        delegates: Delegates<C, H>,
        room_id: String,
        base_url: String,
    ) -> Self {
        Self {
            fsm: ConnFsm::new(),
            delegates,
            auth_manager: AuthManager::new(),
            auth_value: None,
            socket: None,
            receiver: None,
            room_id,
            base_url,
            pending_events: Vec::new(),
            deferred_events: Rc::new(RefCell::new(Vec::new())),
            #[cfg(feature = "wasm")]
            on_deferred_event: None,
        }
    }

    /// Current connection status.
    pub fn status(&self) -> Status {
        self.fsm.status()
    }

    /// Send an event to the FSM and process the resulting effects.
    ///
    /// Effects may trigger follow-up events (e.g. auth success). These
    /// are collected and processed iteratively to avoid async recursion.
    pub async fn send_event(&mut self, event: ConnEvent) {
        let mut pending = vec![event];
        while let Some(ev) = pending.pop() {
            let effects = self.fsm.handle_event(ev);
            let follow_ups = self.process_effects(effects).await;
            pending.extend(follow_ups);
        }
    }

    /// Connect (start the state machine).
    pub async fn connect(&mut self) {
        self.send_event(ConnEvent::Connect).await;
    }

    /// Disconnect.
    pub async fn disconnect(&mut self) {
        self.send_event(ConnEvent::Disconnect).await;
    }

    /// Reconnect.
    pub async fn reconnect(&mut self) {
        self.send_event(ConnEvent::Reconnect).await;
    }

    /// Send a text frame to the current WebSocket, if connected.
    pub fn send(&mut self, data: &str) -> Result<(), String> {
        match &mut self.socket {
            Some(socket) => socket.send_text(data),
            None => Err("Not connected".to_string()),
        }
    }

    /// Take any pending events that should be delivered to the Room.
    pub fn take_events(&mut self) -> Vec<ManagedSocketEvent> {
        std::mem::take(&mut self.pending_events)
    }

    /// Process any deferred events (e.g. from timer fires).
    /// These were spawned as separate tasks and need to be fed back
    /// into the FSM. This should be called from tick().
    pub async fn process_deferred_events(&mut self) {
        loop {
            let events: Vec<ConnEvent> = self.deferred_events.borrow_mut().drain(..).collect();
            if events.is_empty() {
                break;
            }
            for event in events {
                self.send_event(event).await;
            }
        }
    }

    /// Synchronously drain any pending WS events from the channel.
    /// Does not block — only processes messages already buffered.
    /// Close events are fed through the FSM so reconnect logic is triggered.
    pub fn drain_pending_ws_events(&mut self) {
        // First pass: drain channel into a local buffer to release the borrow.
        let mut ws_events = Vec::new();
        if let Some(receiver) = &mut self.receiver {
            loop {
                match receiver.try_recv() {
                    Ok(Some(event)) => ws_events.push(event),
                    Ok(None) => break, // Channel closed
                    Err(()) => break,  // No more buffered events
                }
            }
        }

        // Second pass: process events (now we can mutably borrow self freely).
        for event in ws_events {
            match event {
                WsEvent::Message(text) if text != "pong" => {
                    self.pending_events.push(ManagedSocketEvent::Message(text));
                }
                WsEvent::Close { code, reason } => {
                    // Feed close through the FSM so it can schedule reconnection.
                    self.send_event_sync(ConnEvent::SocketClose { code, reason });
                }
                _ => {}
            }
        }
    }

    /// Synchronously send an event to the FSM and process effects that don't
    /// require async I/O. Effects like StartAuth / StartSocketConnect are
    /// deferred to the async path (they'll be picked up when TimerFired fires).
    pub fn send_event_sync(&mut self, event: ConnEvent) {
        let effects = self.fsm.handle_event(event);
        self.process_effects_sync(effects);
    }

    /// Process FSM effects synchronously. Only handles effects that don't
    /// require async I/O. StartAuth/StartSocketConnect are ignored here —
    /// they'll be triggered by the normal timer→TimerFired→async flow.
    fn process_effects_sync(&mut self, effects: Vec<Effect>) {
        for effect in effects {
            match effect {
                Effect::StartAuth | Effect::StartSocketConnect => {
                    // Requires async I/O. These shouldn't appear on a close-event
                    // path (close → ConnectingBackoff → ScheduleTimer), but if
                    // they do, they'll be picked up when the next timer fires.
                }
                Effect::ScheduleTimer(delay_ms) => {
                    #[cfg(feature = "wasm")]
                    {
                        use wasm_bindgen::JsCast;
                        let deferred = Rc::clone(&self.deferred_events);
                        let wake_cb = self.on_deferred_event.clone();
                        wasm_bindgen_futures::spawn_local(async move {
                            let promise = js_sys::Promise::new(&mut |resolve, _reject| {
                                let set_timeout = js_sys::Reflect::get(
                                    &js_sys::global(),
                                    &wasm_bindgen::JsValue::from_str("setTimeout"),
                                )
                                .expect("setTimeout not found");
                                let set_timeout: js_sys::Function =
                                    set_timeout.unchecked_into();
                                let _ = set_timeout.call2(
                                    &wasm_bindgen::JsValue::NULL,
                                    &resolve,
                                    &wasm_bindgen::JsValue::from_f64(delay_ms as f64),
                                );
                            });
                            let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
                            deferred.borrow_mut().push(ConnEvent::TimerFired);
                            // Wake the RoomHandle so it processes the deferred event.
                            if let Some(cb) = &wake_cb {
                                let _ = cb.call0(&wasm_bindgen::JsValue::NULL);
                            }
                        });
                    }
                    #[cfg(not(feature = "wasm"))]
                    {
                        let _ = delay_ms;
                        self.deferred_events.borrow_mut().push(ConnEvent::TimerFired);
                    }
                }
                Effect::CancelTimer => {
                    self.deferred_events.borrow_mut().clear();
                }
                Effect::SendPing => {
                    if let Some(socket) = &mut self.socket {
                        let _ = socket.send_text("ping");
                    }
                }
                Effect::TeardownSocket => {
                    if let Some(mut socket) = self.socket.take() {
                        let _ = socket.close();
                    }
                    self.receiver = None;
                }
                Effect::NotifyStatusChange(status) => {
                    self.pending_events
                        .push(ManagedSocketEvent::StatusDidChange(status));
                    match status {
                        Status::Connected => {
                            self.pending_events.push(ManagedSocketEvent::Connected);
                        }
                        Status::Disconnected => {
                            self.pending_events.push(ManagedSocketEvent::Disconnected);
                        }
                        _ => {}
                    }
                }
                Effect::NotifyError { message, code } => {
                    self.pending_events
                        .push(ManagedSocketEvent::ConnectionError { message, code });
                }
                Effect::PauseMessageDelivery | Effect::UnpauseMessageDelivery => {}
                Effect::IncrementSuccessCount => {}
                Effect::Log { .. } => {}
            }
        }
    }

    /// Poll for the next incoming WebSocket event and feed it to the FSM.
    /// Returns `true` if an event was processed.
    pub async fn poll_ws_event(&mut self) -> bool {
        let event = match &mut self.receiver {
            Some(receiver) => receiver.recv().await,
            None => return false,
        };

        match event {
            Some(WsEvent::Open) => {
                // Already handled during connect
            }
            Some(WsEvent::Message(text)) => {
                if text == "pong" {
                    self.send_event(ConnEvent::Pong).await;
                } else {
                    self.pending_events.push(ManagedSocketEvent::Message(text));
                }
            }
            Some(WsEvent::Close { code, reason }) => {
                self.send_event(ConnEvent::SocketClose { code, reason }).await;
            }
            Some(WsEvent::Error(_msg)) => {
                // Socket errors: if we still have a socket, it's still open
                let socket_is_open = self.socket.is_some();
                self.send_event(ConnEvent::SocketError { socket_is_open }).await;
            }
            None => {
                // Channel closed — socket is gone
                self.send_event(ConnEvent::SocketError { socket_is_open: false })
                    .await;
                return false;
            }
        }

        true
    }

    /// Process a list of effects produced by the FSM.
    /// Returns follow-up ConnEvents to feed back into the FSM.
    async fn process_effects(&mut self, effects: Vec<Effect>) -> Vec<ConnEvent> {
        let mut follow_ups = Vec::new();
        for effect in effects {
            match effect {
                Effect::StartAuth => {
                    follow_ups.push(self.do_auth().await);
                }
                Effect::StartSocketConnect => {
                    follow_ups.push(self.do_socket_connect().await);
                }
                Effect::ScheduleTimer(delay_ms) => {
                    // Spawn the timer as a separate task so that
                    // send_event() can return after the initial connection.
                    // When the timer fires, it pushes TimerFired into
                    // deferred_events, which are drained on the next tick().
                    #[cfg(feature = "wasm")]
                    {
                        use wasm_bindgen::JsCast;
                        let deferred = Rc::clone(&self.deferred_events);
                        wasm_bindgen_futures::spawn_local(async move {
                            // Use global setTimeout directly (works in both
                            // browser and Node.js) to avoid borrowing self.
                            let promise = js_sys::Promise::new(&mut |resolve, _reject| {
                                let set_timeout = js_sys::Reflect::get(
                                    &js_sys::global(),
                                    &wasm_bindgen::JsValue::from_str("setTimeout"),
                                )
                                .expect("setTimeout not found");
                                let set_timeout: js_sys::Function =
                                    set_timeout.unchecked_into();
                                let _ = set_timeout.call2(
                                    &wasm_bindgen::JsValue::NULL,
                                    &resolve,
                                    &wasm_bindgen::JsValue::from_f64(delay_ms as f64),
                                );
                            });
                            let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
                            deferred.borrow_mut().push(ConnEvent::TimerFired);
                        });
                    }
                    #[cfg(not(feature = "wasm"))]
                    {
                        // For native: await inline (native tests use
                        // tokio which handles this correctly).
                        self.do_schedule_timer(delay_ms).await;
                        follow_ups.push(ConnEvent::TimerFired);
                    }
                }
                Effect::CancelTimer => {
                    // Clear any pending deferred timer events
                    self.deferred_events.borrow_mut().clear();
                }
                Effect::SendPing => {
                    if let Some(socket) = &mut self.socket {
                        let _ = socket.send_text("ping");
                    }
                }
                Effect::TeardownSocket => {
                    if let Some(mut socket) = self.socket.take() {
                        let _ = socket.close();
                    }
                    self.receiver = None;
                }
                Effect::NotifyStatusChange(status) => {
                    self.pending_events
                        .push(ManagedSocketEvent::StatusDidChange(status));
                    match status {
                        Status::Connected => {
                            self.pending_events.push(ManagedSocketEvent::Connected);
                        }
                        Status::Disconnected => {
                            self.pending_events.push(ManagedSocketEvent::Disconnected);
                        }
                        _ => {}
                    }
                }
                Effect::NotifyError { message, code } => {
                    self.pending_events
                        .push(ManagedSocketEvent::ConnectionError { message, code });
                }
                Effect::PauseMessageDelivery | Effect::UnpauseMessageDelivery => {
                    // Handled at the Room level
                }
                Effect::IncrementSuccessCount => {
                    // Already tracked inside FSM
                }
                Effect::Log {
                    level: _,
                    message: _,
                } => {}
            }
        }
        follow_ups
    }

    /// Perform the auth flow. Returns the ConnEvent to feed back.
    async fn do_auth(&mut self) -> ConnEvent {
        match &self.delegates.auth_endpoint {
            AuthEndpoint::PublicKey(key) => {
                self.auth_value = Some(AuthValue::Public {
                    public_api_key: key.clone(),
                });
                ConnEvent::AuthSuccess
            }
            AuthEndpoint::PrivateEndpoint { url } => {
                let req = HttpRequest {
                    method: HttpMethod::Post,
                    url: url.clone(),
                    headers: vec![(
                        "Content-Type".to_string(),
                        "application/json".to_string(),
                    )],
                    body: Some(format!(r#"{{"room":"{}"}}"#, self.room_id)),
                };

                match self.delegates.http_client.request(req).await {
                    Ok(response) => {
                        if crate::auth::NON_RETRY_STATUS_CODES.contains(&response.status) {
                            return ConnEvent::AuthFailed {
                                stop_retrying: true,
                            };
                        }

                        if response.status != 200 {
                            return ConnEvent::AuthFailed {
                                stop_retrying: false,
                            };
                        }

                        match serde_json::from_str::<serde_json::Value>(&response.body) {
                            Ok(json) => {
                                if let Some(token_str) =
                                    json.get("token").and_then(|v| v.as_str())
                                {
                                    match parse_auth_token(token_str) {
                                        Ok(parsed) => {
                                            let _ = self
                                                .auth_manager
                                                .cache_token(parsed.clone(), now_secs());
                                            self.auth_value =
                                                Some(AuthValue::Secret { token: parsed });
                                            ConnEvent::AuthSuccess
                                        }
                                        Err(_) => ConnEvent::AuthFailed {
                                            stop_retrying: true,
                                        },
                                    }
                                } else {
                                    ConnEvent::AuthFailed {
                                        stop_retrying: true,
                                    }
                                }
                            }
                            Err(_) => ConnEvent::AuthFailed {
                                stop_retrying: false,
                            },
                        }
                    }
                    Err(_) => ConnEvent::AuthFailed {
                        stop_retrying: false,
                    },
                }
            }
        }
    }

    /// Open a WebSocket connection using the stored auth value.
    /// Returns the ConnEvent to feed back.
    async fn do_socket_connect(&mut self) -> ConnEvent {
        let auth_value = match &self.auth_value {
            Some(v) => v.clone(),
            None => {
                return ConnEvent::SocketConnectFailed {
                    close_code: None,
                    reason: "No auth value available".to_string(),
                    stop_retrying: false,
                };
            }
        };

        let url = match &auth_value {
            AuthValue::Secret { token } => {
                format!(
                    "{}/v7?roomId={}&tok={}",
                    self.base_url
                        .replace("https://", "wss://")
                        .replace("http://", "ws://"),
                    urlencoding_room_id(&self.room_id),
                    &token.raw
                )
            }
            AuthValue::Public { public_api_key } => {
                format!(
                    "{}/v7?roomId={}&pubkey={}",
                    self.base_url
                        .replace("https://", "wss://")
                        .replace("http://", "ws://"),
                    urlencoding_room_id(&self.room_id),
                    public_api_key
                )
            }
        };

        match self.delegates.connector.connect(&url).await {
            Ok((socket, receiver)) => {
                self.socket = Some(socket);
                self.receiver = Some(receiver);
                ConnEvent::SocketConnected
            }
            Err(e) => ConnEvent::SocketConnectFailed {
                close_code: None,
                reason: e,
                stop_retrying: false,
            },
        }
    }

    /// Schedule a timer delay.
    async fn do_schedule_timer(&mut self, delay_ms: u64) {
        self.delegates.timer.delay(delay_ms).await;
    }
}

/// Simple URL-encoding for room IDs (just the basics).
fn urlencoding_room_id(room_id: &str) -> String {
    room_id
        .replace('%', "%25")
        .replace(' ', "%20")
        .replace('#', "%23")
        .replace('&', "%26")
        .replace('?', "%3F")
        .replace('=', "%3D")
}

/// Get current time in seconds since epoch.
fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_urlencoding_room_id() {
        assert_eq!(urlencoding_room_id("simple-room"), "simple-room");
        assert_eq!(
            urlencoding_room_id("room with spaces"),
            "room%20with%20spaces"
        );
        assert_eq!(urlencoding_room_id("room#1"), "room%231");
        assert_eq!(urlencoding_room_id("room&key=val"), "room%26key%3Dval");
    }
}
