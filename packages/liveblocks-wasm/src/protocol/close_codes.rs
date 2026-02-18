//! WebSocket close code classification.
//!
//! Mirrors the logic in `packages/liveblocks-core/src/types/IWebSocket.ts`.

/// Well-known WebSocket close codes used by the Liveblocks protocol.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u16)]
pub enum WebsocketCloseCode {
    /// Normal close of connection, the connection fulfilled its purpose.
    CloseNormal = 1000,
    /// Unexpected error happened with the network/infra level. In spirit akin to HTTP 503
    CloseAbnormal = 1006,
    /// Unexpected error happened. In spirit akin to HTTP 500
    UnexpectedCondition = 1011,
    /// Please back off for now, but try again in a few moments
    TryAgainLater = 1013,
    /// Message wasn't understood, disconnect
    InvalidMessageFormat = 4000,
    /// Server refused to allow connection. Re-authorizing won't help. Disconnect.
    NotAllowed = 4001,
    /// Max concurrent connections per room
    MaxConcurrentConnectionsPerRoom = 4005,
    /// The room's ID was updated, disconnect
    RoomIdUpdated = 4006,
    /// The server kicked the connection from the room.
    Kicked = 4100,
    /// The auth token is expired, reauthorize to get a fresh one.
    TokenExpired = 4109,
    /// Disconnect immediately
    CloseWithoutRetry = 4999,
}

/// Returns true if the client should disconnect permanently (move to IdleFailed).
///
/// Codes: 4999 or 40xx range (4000-4099).
pub fn should_disconnect(code: u16) -> bool {
    code == WebsocketCloseCode::CloseWithoutRetry as u16
        || (code >= 4000 && code < 4100)
}

/// Returns true if the client should reauthorize.
///
/// Codes: 41xx range (4100-4199).
pub fn should_reauth(code: u16) -> bool {
    code >= 4100 && code < 4200
}

/// Returns true if the client should retry without reauthorizing.
///
/// Codes: 1013 (TRY_AGAIN_LATER) or 42xx range (4200-4299).
pub fn should_retry_without_reauth(code: u16) -> bool {
    code == WebsocketCloseCode::TryAgainLater as u16
        || (code >= 4200 && code < 4300)
}

/// Returns true if the close code indicates an expired token (4109).
/// This is a special case: reauth immediately without backoff.
pub fn is_token_expired(code: u16) -> bool {
    code == WebsocketCloseCode::TokenExpired as u16
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_disconnect() {
        // 4999 -> disconnect
        assert!(should_disconnect(4999));
        // 40xx range -> disconnect
        assert!(should_disconnect(4000));
        assert!(should_disconnect(4001));
        assert!(should_disconnect(4005));
        assert!(should_disconnect(4006));
        assert!(should_disconnect(4099));
        // 41xx -> NOT disconnect (reauth instead)
        assert!(!should_disconnect(4100));
        assert!(!should_disconnect(4109));
        // 42xx -> NOT disconnect
        assert!(!should_disconnect(4200));
        // Normal close -> NOT disconnect
        assert!(!should_disconnect(1000));
        assert!(!should_disconnect(1006));
    }

    #[test]
    fn test_should_reauth() {
        // 41xx range -> reauth
        assert!(should_reauth(4100));
        assert!(should_reauth(4109));
        assert!(should_reauth(4199));
        // 40xx -> NOT reauth
        assert!(!should_reauth(4000));
        assert!(!should_reauth(4099));
        // 42xx -> NOT reauth
        assert!(!should_reauth(4200));
        // Normal codes -> NOT reauth
        assert!(!should_reauth(1000));
    }

    #[test]
    fn test_should_retry_without_reauth() {
        // 1013 -> retry without reauth
        assert!(should_retry_without_reauth(1013));
        // 42xx range -> retry without reauth
        assert!(should_retry_without_reauth(4200));
        assert!(should_retry_without_reauth(4299));
        // 40xx -> NOT retry without reauth
        assert!(!should_retry_without_reauth(4000));
        // 41xx -> NOT retry without reauth
        assert!(!should_retry_without_reauth(4100));
        // 4999 -> NOT retry without reauth
        assert!(!should_retry_without_reauth(4999));
    }

    #[test]
    fn test_is_token_expired() {
        assert!(is_token_expired(4109));
        assert!(!is_token_expired(4100));
        assert!(!is_token_expired(4000));
        assert!(!is_token_expired(1000));
    }

    #[test]
    fn test_close_code_routing_coverage() {
        // For every close code, exactly one of the three functions should return true,
        // or none of them (for normal close codes like 1000, 1006, 1011).
        let test_codes = [
            1000, 1006, 1011, 1013, 4000, 4001, 4005, 4006, 4099, 4100, 4109,
            4199, 4200, 4299, 4999,
        ];
        for code in test_codes {
            let d = should_disconnect(code);
            let r = should_reauth(code);
            let rn = should_retry_without_reauth(code);
            // At most one should be true (they're mutually exclusive)
            let count = d as u8 + r as u8 + rn as u8;
            assert!(
                count <= 1,
                "Code {code}: disconnect={d}, reauth={r}, retry_no_reauth={rn} — expected at most 1 true"
            );
        }
    }
}
