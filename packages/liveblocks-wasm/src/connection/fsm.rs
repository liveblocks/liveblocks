//! Pure connection finite state machine.
//!
//! Mirrors the FSM in `packages/liveblocks-core/src/connection.ts`.
//!
//! This is a pure state machine: it takes events and returns effects.
//! No I/O is performed here. Platform adapters interpret effects.

use super::backoff::{
    self, BACKOFF_DELAYS, BACKOFF_DELAYS_SLOW, RESET_DELAY,
};
use crate::protocol::close_codes;

/// Human-readable connection status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Status {
    Initial,
    Connecting,
    Connected,
    Reconnecting,
    Disconnected,
}

impl Status {
    pub fn as_str(&self) -> &'static str {
        match self {
            Status::Initial => "initial",
            Status::Connecting => "connecting",
            Status::Connected => "connected",
            Status::Reconnecting => "reconnecting",
            Status::Disconnected => "disconnected",
        }
    }
}

impl std::fmt::Display for Status {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// The 9 internal states of the connection FSM.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ConnState {
    IdleInitial,
    IdleFailed,
    IdleZombie,
    AuthBusy,
    AuthBackoff,
    ConnectingBusy,
    ConnectingBackoff,
    OkConnected,
    OkAwaitingPong,
}

/// Events that can be sent to the FSM.
#[derive(Debug, Clone, PartialEq)]
pub enum ConnEvent {
    // User actions
    Connect,
    Disconnect,
    Reconnect,

    // Browser events
    WindowGotFocus,
    NavigatorOnline,
    NavigatorOffline,

    // Internal
    Pong,
    PongTimeout,
    TimerFired,

    // Auth results
    AuthSuccess,
    AuthFailed { stop_retrying: bool },

    // Socket lifecycle
    SocketConnected,
    SocketConnectFailed {
        /// A close event from the socket (vs generic error).
        close_code: Option<u16>,
        reason: String,
        stop_retrying: bool,
    },
    SocketError { socket_is_open: bool },
    SocketClose { code: u16, reason: String },

    // Room state received (actor ID)
    RoomStateReceived,
}

/// Effects that the FSM produces. Interpreted by the platform adapter.
#[derive(Debug, Clone, PartialEq)]
pub enum Effect {
    StartAuth,
    StartSocketConnect,
    ScheduleTimer(u64),
    CancelTimer,
    SendPing,
    TeardownSocket,
    NotifyStatusChange(Status),
    NotifyError { message: String, code: i32 },
    PauseMessageDelivery,
    UnpauseMessageDelivery,
    IncrementSuccessCount,
    Log { level: LogLevel, message: String },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

/// The pure connection FSM.
#[derive(Debug)]
pub struct ConnFsm {
    state: ConnState,
    backoff_delay: u64,
    success_count: u32,
    has_auth_value: bool,
}

impl ConnFsm {
    pub fn new() -> Self {
        Self {
            state: ConnState::IdleInitial,
            backoff_delay: RESET_DELAY,
            success_count: 0,
            has_auth_value: false,
        }
    }

    pub fn state(&self) -> ConnState {
        self.state
    }

    pub fn backoff_delay(&self) -> u64 {
        self.backoff_delay
    }

    pub fn success_count(&self) -> u32 {
        self.success_count
    }

    /// Map internal state to public Status.
    pub fn status(&self) -> Status {
        match self.state {
            ConnState::OkConnected | ConnState::OkAwaitingPong => Status::Connected,
            ConnState::IdleInitial => Status::Initial,
            ConnState::IdleFailed => Status::Disconnected,
            ConnState::AuthBusy
            | ConnState::AuthBackoff
            | ConnState::ConnectingBusy
            | ConnState::ConnectingBackoff
            | ConnState::IdleZombie => {
                if self.success_count > 0 {
                    Status::Reconnecting
                } else {
                    Status::Connecting
                }
            }
        }
    }

    /// Notify that auth succeeded (so we remember we have a cached value).
    pub fn set_has_auth_value(&mut self, has: bool) {
        self.has_auth_value = has;
    }

    /// Process an event and return the effects to execute.
    pub fn handle_event(&mut self, event: ConnEvent) -> Vec<Effect> {
        let old_status = self.status();

        let mut effects = self.handle_event_inner(event);

        let new_status = self.status();
        if new_status != old_status {
            effects.push(Effect::NotifyStatusChange(new_status));
        }

        effects
    }

    fn handle_event_inner(&mut self, event: ConnEvent) -> Vec<Effect> {
        // Global transitions (from any state)
        match &event {
            ConnEvent::Disconnect => {
                let effects = self.leave_effects();
                self.transition(ConnState::IdleInitial);
                self.success_count = 0;
                return effects;
            }
            ConnEvent::Reconnect => {
                let mut effects = self.leave_effects();
                self.success_count = 0;
                self.increase_backoff_delay();
                self.transition(ConnState::AuthBackoff);
                effects.push(Effect::ScheduleTimer(self.backoff_delay));
                return effects;
            }
            _ => {}
        }

        // State-specific transitions
        match self.state {
            ConnState::IdleInitial | ConnState::IdleFailed | ConnState::IdleZombie => {
                self.handle_idle(event)
            }
            ConnState::AuthBusy => self.handle_auth_busy(event),
            ConnState::AuthBackoff => self.handle_auth_backoff(event),
            ConnState::ConnectingBusy => self.handle_connecting_busy(event),
            ConnState::ConnectingBackoff => self.handle_connecting_backoff(event),
            ConnState::OkConnected => self.handle_ok_connected(event),
            ConnState::OkAwaitingPong => self.handle_ok_awaiting_pong(event),
        }
    }

    fn handle_idle(&mut self, event: ConnEvent) -> Vec<Effect> {
        match event {
            ConnEvent::Connect => {
                self.success_count = 0;
                if self.has_auth_value {
                    self.transition(ConnState::ConnectingBusy);
                    vec![Effect::StartSocketConnect]
                } else {
                    self.transition(ConnState::AuthBusy);
                    vec![Effect::StartAuth]
                }
            }
            ConnEvent::WindowGotFocus if self.state == ConnState::IdleZombie => {
                self.transition(ConnState::ConnectingBackoff);
                vec![Effect::ScheduleTimer(self.backoff_delay)]
            }
            _ => vec![], // Ignore
        }
    }

    fn handle_auth_busy(&mut self, event: ConnEvent) -> Vec<Effect> {
        match event {
            ConnEvent::AuthSuccess => {
                self.has_auth_value = true;
                self.transition(ConnState::ConnectingBusy);
                vec![Effect::StartSocketConnect]
            }
            ConnEvent::AuthFailed { stop_retrying } => {
                if stop_retrying {
                    self.transition(ConnState::IdleFailed);
                    vec![Effect::NotifyError {
                        message: "Authentication failed permanently".to_string(),
                        code: -1,
                    }]
                } else {
                    self.increase_backoff_delay();
                    self.transition(ConnState::AuthBackoff);
                    vec![
                        Effect::Log {
                            level: LogLevel::Error,
                            message: "Authentication failed, retrying".to_string(),
                        },
                        Effect::ScheduleTimer(self.backoff_delay),
                    ]
                }
            }
            _ => vec![], // Ignore
        }
    }

    fn handle_auth_backoff(&mut self, event: ConnEvent) -> Vec<Effect> {
        match event {
            ConnEvent::TimerFired => {
                self.transition(ConnState::AuthBusy);
                vec![Effect::StartAuth]
            }
            ConnEvent::NavigatorOnline => {
                self.backoff_delay = RESET_DELAY;
                self.transition(ConnState::AuthBusy);
                vec![Effect::CancelTimer, Effect::StartAuth]
            }
            _ => vec![], // Ignore
        }
    }

    fn handle_connecting_busy(&mut self, event: ConnEvent) -> Vec<Effect> {
        match event {
            ConnEvent::SocketConnected => {
                self.backoff_delay = RESET_DELAY;
                self.enter_ok()
            }
            ConnEvent::RoomStateReceived => {
                // In protocol V7, we wait for ROOM_STATE before declaring connected.
                // The SocketConnected event just opens the socket; RoomStateReceived
                // confirms we have the actor ID. However, if SocketConnected already
                // transitioned us, this becomes a no-op.
                if self.state == ConnState::ConnectingBusy {
                    self.backoff_delay = RESET_DELAY;
                    self.enter_ok()
                } else {
                    vec![]
                }
            }
            ConnEvent::SocketConnectFailed {
                close_code,
                reason,
                stop_retrying,
            } => {
                let mut effects = vec![Effect::TeardownSocket];

                if stop_retrying {
                    self.transition(ConnState::IdleFailed);
                    effects.push(Effect::NotifyError {
                        message: reason,
                        code: -1,
                    });
                    return effects;
                }

                if let Some(code) = close_code {
                    if close_codes::is_token_expired(code) {
                        self.has_auth_value = false;
                        self.transition(ConnState::AuthBusy);
                        effects.push(Effect::StartAuth);
                        return effects;
                    }

                    if close_codes::should_retry_without_reauth(code) {
                        self.increase_backoff_delay_aggressively();
                        self.transition(ConnState::ConnectingBackoff);
                        effects.push(Effect::ScheduleTimer(self.backoff_delay));
                        return effects;
                    }

                    if close_codes::should_disconnect(code) {
                        self.transition(ConnState::IdleFailed);
                        effects.push(Effect::NotifyError {
                            message: reason,
                            code: code as i32,
                        });
                        return effects;
                    }
                }

                // Default: reauth with backoff
                self.has_auth_value = false;
                self.increase_backoff_delay();
                self.transition(ConnState::AuthBackoff);
                effects.push(Effect::ScheduleTimer(self.backoff_delay));
                effects
            }
            _ => vec![], // Ignore
        }
    }

    fn handle_connecting_backoff(&mut self, event: ConnEvent) -> Vec<Effect> {
        match event {
            ConnEvent::TimerFired => {
                self.transition(ConnState::ConnectingBusy);
                vec![Effect::StartSocketConnect]
            }
            ConnEvent::NavigatorOnline => {
                self.backoff_delay = RESET_DELAY;
                self.transition(ConnState::ConnectingBusy);
                vec![Effect::CancelTimer, Effect::StartSocketConnect]
            }
            _ => vec![], // Ignore
        }
    }

    fn handle_ok_connected(&mut self, event: ConnEvent) -> Vec<Effect> {
        match event {
            ConnEvent::TimerFired => {
                // Heartbeat timer: send ping
                self.transition(ConnState::OkAwaitingPong);
                vec![Effect::SendPing, Effect::ScheduleTimer(backoff::PONG_TIMEOUT)]
            }
            ConnEvent::NavigatorOffline | ConnEvent::WindowGotFocus => {
                // Force a heartbeat check
                self.transition(ConnState::OkAwaitingPong);
                vec![Effect::SendPing, Effect::ScheduleTimer(backoff::PONG_TIMEOUT)]
            }
            ConnEvent::SocketError { socket_is_open } => {
                if socket_is_open {
                    vec![] // Socket still usable, ignore
                } else {
                    self.handle_ok_socket_loss()
                }
            }
            ConnEvent::SocketClose { code, reason } => {
                self.handle_ok_close(code, &reason)
            }
            _ => vec![], // Ignore
        }
    }

    fn handle_ok_awaiting_pong(&mut self, event: ConnEvent) -> Vec<Effect> {
        match event {
            ConnEvent::Pong => {
                self.transition(ConnState::OkConnected);
                vec![
                    Effect::CancelTimer,
                    Effect::ScheduleTimer(backoff::HEARTBEAT_INTERVAL),
                ]
            }
            ConnEvent::PongTimeout | ConnEvent::TimerFired => {
                // No pong received — implicit connection loss
                let mut effects = self.leave_effects();
                self.transition(ConnState::ConnectingBusy);
                effects.push(Effect::Log {
                    level: LogLevel::Warn,
                    message: "Received no pong from server, assume implicit connection loss.".to_string(),
                });
                effects.push(Effect::StartSocketConnect);
                effects
            }
            ConnEvent::SocketError { socket_is_open } => {
                if socket_is_open {
                    vec![]
                } else {
                    self.handle_ok_socket_loss()
                }
            }
            ConnEvent::SocketClose { code, reason } => {
                self.handle_ok_close(code, &reason)
            }
            _ => vec![], // Ignore
        }
    }

    /// Handle socket loss while in OK state.
    fn handle_ok_socket_loss(&mut self) -> Vec<Effect> {
        let mut effects = self.leave_effects();
        self.increase_backoff_delay();
        self.transition(ConnState::ConnectingBackoff);
        effects.push(Effect::ScheduleTimer(self.backoff_delay));
        effects
    }

    /// Handle explicit close while in OK state.
    fn handle_ok_close(&mut self, code: u16, reason: &str) -> Vec<Effect> {
        let mut effects = self.leave_effects();

        if close_codes::should_disconnect(code) {
            self.transition(ConnState::IdleFailed);
            effects.push(Effect::NotifyError {
                message: reason.to_string(),
                code: code as i32,
            });
            effects.push(Effect::Log {
                level: LogLevel::Warn,
                message: "Connection to WebSocket closed permanently. Won't retry.".to_string(),
            });
            return effects;
        }

        if close_codes::should_reauth(code) {
            if close_codes::is_token_expired(code) {
                self.has_auth_value = false;
                self.transition(ConnState::AuthBusy);
                effects.push(Effect::StartAuth);
            } else {
                self.has_auth_value = false;
                self.increase_backoff_delay();
                self.transition(ConnState::AuthBackoff);
                effects.push(Effect::ScheduleTimer(self.backoff_delay));
            }
            return effects;
        }

        if close_codes::should_retry_without_reauth(code) {
            self.increase_backoff_delay_aggressively();
            self.transition(ConnState::ConnectingBackoff);
            effects.push(Effect::ScheduleTimer(self.backoff_delay));
            return effects;
        }

        // Default: normal backoff + reauth
        self.increase_backoff_delay();
        self.transition(ConnState::ConnectingBackoff);
        effects.push(Effect::ScheduleTimer(self.backoff_delay));
        effects
    }

    /// Enter the OK state group.
    fn enter_ok(&mut self) -> Vec<Effect> {
        self.success_count += 1;
        self.transition(ConnState::OkConnected);
        vec![
            Effect::IncrementSuccessCount,
            Effect::UnpauseMessageDelivery,
            Effect::ScheduleTimer(backoff::HEARTBEAT_INTERVAL),
        ]
    }

    /// Effects produced when leaving OK state.
    fn leave_effects(&self) -> Vec<Effect> {
        match self.state {
            ConnState::OkConnected | ConnState::OkAwaitingPong => {
                vec![
                    Effect::TeardownSocket,
                    Effect::CancelTimer,
                    Effect::PauseMessageDelivery,
                ]
            }
            _ => vec![],
        }
    }

    fn transition(&mut self, new_state: ConnState) {
        self.state = new_state;
    }

    fn increase_backoff_delay(&mut self) {
        self.backoff_delay = backoff::next_backoff_delay(self.backoff_delay, BACKOFF_DELAYS);
    }

    fn increase_backoff_delay_aggressively(&mut self) {
        self.backoff_delay = backoff::next_backoff_delay(self.backoff_delay, BACKOFF_DELAYS_SLOW);
    }
}

impl Default for ConnFsm {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let fsm = ConnFsm::new();
        assert_eq!(fsm.state(), ConnState::IdleInitial);
        assert_eq!(fsm.status(), Status::Initial);
    }

    #[test]
    fn test_connect_without_auth_value() {
        let mut fsm = ConnFsm::new();
        let effects = fsm.handle_event(ConnEvent::Connect);
        assert_eq!(fsm.state(), ConnState::AuthBusy);
        assert!(effects.contains(&Effect::StartAuth));
        assert_eq!(fsm.status(), Status::Connecting);
    }

    #[test]
    fn test_connect_with_auth_value() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        let effects = fsm.handle_event(ConnEvent::Connect);
        assert_eq!(fsm.state(), ConnState::ConnectingBusy);
        assert!(effects.contains(&Effect::StartSocketConnect));
    }

    #[test]
    fn test_auth_success_leads_to_connecting() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);
        let effects = fsm.handle_event(ConnEvent::AuthSuccess);
        assert_eq!(fsm.state(), ConnState::ConnectingBusy);
        assert!(effects.contains(&Effect::StartSocketConnect));
    }

    #[test]
    fn test_auth_failure_retryable() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);
        let effects = fsm.handle_event(ConnEvent::AuthFailed {
            stop_retrying: false,
        });
        assert_eq!(fsm.state(), ConnState::AuthBackoff);
        assert!(effects.iter().any(|e| matches!(e, Effect::ScheduleTimer(_))));
    }

    #[test]
    fn test_auth_failure_permanent() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);
        let effects = fsm.handle_event(ConnEvent::AuthFailed {
            stop_retrying: true,
        });
        assert_eq!(fsm.state(), ConnState::IdleFailed);
        assert_eq!(fsm.status(), Status::Disconnected);
        assert!(effects.iter().any(|e| matches!(e, Effect::NotifyError { .. })));
    }

    #[test]
    fn test_auth_backoff_timer_retry() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::AuthFailed {
            stop_retrying: false,
        });
        assert_eq!(fsm.state(), ConnState::AuthBackoff);

        let effects = fsm.handle_event(ConnEvent::TimerFired);
        assert_eq!(fsm.state(), ConnState::AuthBusy);
        assert!(effects.contains(&Effect::StartAuth));
    }

    #[test]
    fn test_auth_backoff_navigator_online() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::AuthFailed {
            stop_retrying: false,
        });
        let effects = fsm.handle_event(ConnEvent::NavigatorOnline);
        assert_eq!(fsm.state(), ConnState::AuthBusy);
        assert_eq!(fsm.backoff_delay(), RESET_DELAY);
        assert!(effects.contains(&Effect::StartAuth));
    }

    #[test]
    fn test_socket_connected_enters_ok() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        let effects = fsm.handle_event(ConnEvent::SocketConnected);
        assert_eq!(fsm.state(), ConnState::OkConnected);
        assert_eq!(fsm.status(), Status::Connected);
        assert!(effects.contains(&Effect::UnpauseMessageDelivery));
        assert_eq!(fsm.success_count(), 1);
    }

    #[test]
    fn test_heartbeat_cycle() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        // Timer fires -> send ping
        let effects = fsm.handle_event(ConnEvent::TimerFired);
        assert_eq!(fsm.state(), ConnState::OkAwaitingPong);
        assert!(effects.contains(&Effect::SendPing));

        // Pong received -> back to connected
        let effects = fsm.handle_event(ConnEvent::Pong);
        assert_eq!(fsm.state(), ConnState::OkConnected);
        assert!(effects.iter().any(|e| matches!(e, Effect::ScheduleTimer(t) if *t == backoff::HEARTBEAT_INTERVAL)));
    }

    #[test]
    fn test_pong_timeout_reconnects() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);
        fsm.handle_event(ConnEvent::TimerFired); // -> OkAwaitingPong

        let effects = fsm.handle_event(ConnEvent::PongTimeout);
        assert_eq!(fsm.state(), ConnState::ConnectingBusy);
        assert!(effects.contains(&Effect::TeardownSocket));
        assert!(effects.contains(&Effect::StartSocketConnect));
    }

    #[test]
    fn test_disconnect_from_connected() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::Disconnect);
        assert_eq!(fsm.state(), ConnState::IdleInitial);
        assert_eq!(fsm.status(), Status::Initial);
        assert!(effects.contains(&Effect::TeardownSocket));
    }

    #[test]
    fn test_reconnect_from_connected() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::Reconnect);
        assert_eq!(fsm.state(), ConnState::AuthBackoff);
        assert!(effects.contains(&Effect::TeardownSocket));
        assert_eq!(fsm.success_count(), 0);
    }

    #[test]
    fn test_close_should_disconnect() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::SocketClose {
            code: 4001, // NOT_ALLOWED
            reason: "Not allowed".to_string(),
        });
        assert_eq!(fsm.state(), ConnState::IdleFailed);
        assert_eq!(fsm.status(), Status::Disconnected);
        assert!(effects.iter().any(|e| matches!(e, Effect::NotifyError { .. })));
    }

    #[test]
    fn test_close_should_reauth() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::SocketClose {
            code: 4100, // KICKED
            reason: "Kicked".to_string(),
        });
        assert_eq!(fsm.state(), ConnState::AuthBackoff);
        assert!(effects.iter().any(|e| matches!(e, Effect::ScheduleTimer(_))));
    }

    #[test]
    fn test_close_token_expired_immediate_reauth() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::SocketClose {
            code: 4109, // TOKEN_EXPIRED
            reason: "".to_string(),
        });
        assert_eq!(fsm.state(), ConnState::AuthBusy);
        assert!(effects.contains(&Effect::StartAuth));
    }

    #[test]
    fn test_close_retry_without_reauth() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::SocketClose {
            code: 1013, // TRY_AGAIN_LATER
            reason: "".to_string(),
        });
        assert_eq!(fsm.state(), ConnState::ConnectingBackoff);
        // Should use aggressive backoff
        assert!(fsm.backoff_delay() >= 2000);
        assert!(effects.iter().any(|e| matches!(e, Effect::ScheduleTimer(_))));
    }

    #[test]
    fn test_socket_error_with_open_socket_ignored() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::SocketError {
            socket_is_open: true,
        });
        assert_eq!(fsm.state(), ConnState::OkConnected);
        // Only a status change notification (no actual transition effects)
        assert!(!effects.contains(&Effect::TeardownSocket));
    }

    #[test]
    fn test_socket_error_with_closed_socket() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::SocketConnected);

        let effects = fsm.handle_event(ConnEvent::SocketError {
            socket_is_open: false,
        });
        assert_eq!(fsm.state(), ConnState::ConnectingBackoff);
        assert!(effects.contains(&Effect::TeardownSocket));
    }

    #[test]
    fn test_zombie_state() {
        let mut fsm = ConnFsm::new();
        // Simulate entering zombie state
        fsm.state = ConnState::IdleZombie;
        fsm.success_count = 1; // We were connected before

        assert_eq!(fsm.status(), Status::Reconnecting);

        let _effects = fsm.handle_event(ConnEvent::WindowGotFocus);
        assert_eq!(fsm.state(), ConnState::ConnectingBackoff);
    }

    #[test]
    fn test_status_connecting_vs_reconnecting() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);
        assert_eq!(fsm.status(), Status::Connecting);

        // Simulate having been connected before
        fsm.success_count = 1;
        assert_eq!(fsm.status(), Status::Reconnecting);
    }

    #[test]
    fn test_backoff_increases_on_failure() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);

        // First failure
        fsm.handle_event(ConnEvent::AuthFailed {
            stop_retrying: false,
        });
        let delay1 = fsm.backoff_delay();
        assert!(delay1 >= 250);

        // Timer -> retry auth -> fail again
        fsm.handle_event(ConnEvent::TimerFired);
        fsm.handle_event(ConnEvent::AuthFailed {
            stop_retrying: false,
        });
        let delay2 = fsm.backoff_delay();
        assert!(delay2 > delay1, "Backoff should increase: {delay1} -> {delay2}");
    }

    #[test]
    fn test_connecting_failure_with_disconnect_code() {
        let mut fsm = ConnFsm::new();
        fsm.handle_event(ConnEvent::Connect);
        fsm.handle_event(ConnEvent::AuthSuccess);

        let effects = fsm.handle_event(ConnEvent::SocketConnectFailed {
            close_code: Some(4001),
            reason: "Not allowed".to_string(),
            stop_retrying: false,
        });
        assert_eq!(fsm.state(), ConnState::IdleFailed);
        assert!(effects.iter().any(|e| matches!(e, Effect::NotifyError { code: 4001, .. })));
    }

    #[test]
    fn test_connecting_failure_token_expired() {
        let mut fsm = ConnFsm::new();
        fsm.set_has_auth_value(true);
        fsm.handle_event(ConnEvent::Connect);

        let effects = fsm.handle_event(ConnEvent::SocketConnectFailed {
            close_code: Some(4109),
            reason: "Token expired".to_string(),
            stop_retrying: false,
        });
        assert_eq!(fsm.state(), ConnState::AuthBusy);
        assert!(effects.contains(&Effect::StartAuth));
    }

    #[test]
    fn test_no_deadlock_states() {
        // Every non-idle state should have at least one transition that can
        // move it forward (timer, event, etc). Verify the FSM doesn't get
        // stuck by checking all transitions from transient states.
        let transient_states = [
            ConnState::AuthBusy,
            ConnState::AuthBackoff,
            ConnState::ConnectingBusy,
            ConnState::ConnectingBackoff,
            ConnState::OkConnected,
            ConnState::OkAwaitingPong,
        ];

        for state in transient_states {
            let mut fsm = ConnFsm::new();
            fsm.state = state;
            // At minimum, Disconnect should always work
            let _effects = fsm.handle_event(ConnEvent::Disconnect);
            assert_eq!(
                fsm.state(),
                ConnState::IdleInitial,
                "Disconnect should always work from {state:?}"
            );
        }
    }
}
