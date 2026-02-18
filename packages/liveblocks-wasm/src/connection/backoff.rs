//! Backoff delay sequences.
//!
//! Mirrors the delay constants from `packages/liveblocks-core/src/connection.ts`.

/// Normal backoff delays in milliseconds.
pub const BACKOFF_DELAYS: &[u64] = &[250, 500, 1_000, 2_000, 4_000, 8_000, 10_000];

/// Aggressive backoff delays in milliseconds (for rate limiting, room full, etc).
pub const BACKOFF_DELAYS_SLOW: &[u64] = &[2_000, 30_000, 60_000, 300_000];

/// Reset delay: one less than the first normal tier.
/// After a successful connection, the delay is reset to this.
pub const RESET_DELAY: u64 = BACKOFF_DELAYS[0] - 1; // 249

/// Heartbeat ping interval in milliseconds.
pub const HEARTBEAT_INTERVAL: u64 = 30_000;

/// Time to wait for a pong response before assuming connection lost.
pub const PONG_TIMEOUT: u64 = 2_000;

/// Maximum time for authentication to complete.
pub const AUTH_TIMEOUT: u64 = 10_000;

/// Maximum time for socket connection to complete.
pub const SOCKET_CONNECT_TIMEOUT: u64 = 20_000;

/// Advance to the next backoff delay tier.
pub fn next_backoff_delay(current: u64, delays: &[u64]) -> u64 {
    delays
        .iter()
        .find(|&&d| d > current)
        .copied()
        .unwrap_or_else(|| *delays.last().unwrap_or(&current))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_next_backoff_delay_normal() {
        assert_eq!(next_backoff_delay(0, BACKOFF_DELAYS), 250);
        assert_eq!(next_backoff_delay(249, BACKOFF_DELAYS), 250);
        assert_eq!(next_backoff_delay(250, BACKOFF_DELAYS), 500);
        assert_eq!(next_backoff_delay(500, BACKOFF_DELAYS), 1000);
        assert_eq!(next_backoff_delay(1000, BACKOFF_DELAYS), 2000);
        assert_eq!(next_backoff_delay(2000, BACKOFF_DELAYS), 4000);
        assert_eq!(next_backoff_delay(4000, BACKOFF_DELAYS), 8000);
        assert_eq!(next_backoff_delay(8000, BACKOFF_DELAYS), 10000);
        // At max, stays at max
        assert_eq!(next_backoff_delay(10000, BACKOFF_DELAYS), 10000);
        assert_eq!(next_backoff_delay(99999, BACKOFF_DELAYS), 10000);
    }

    #[test]
    fn test_next_backoff_delay_aggressive() {
        assert_eq!(next_backoff_delay(0, BACKOFF_DELAYS_SLOW), 2000);
        assert_eq!(next_backoff_delay(2000, BACKOFF_DELAYS_SLOW), 30000);
        assert_eq!(next_backoff_delay(30000, BACKOFF_DELAYS_SLOW), 60000);
        assert_eq!(next_backoff_delay(60000, BACKOFF_DELAYS_SLOW), 300000);
        assert_eq!(next_backoff_delay(300000, BACKOFF_DELAYS_SLOW), 300000);
    }

    #[test]
    fn test_reset_delay_is_correct() {
        assert_eq!(RESET_DELAY, 249);
        // After reset, next_backoff should hit the first tier
        assert_eq!(next_backoff_delay(RESET_DELAY, BACKOFF_DELAYS), 250);
    }

    #[test]
    fn test_delay_sequences_are_monotonic() {
        for window in BACKOFF_DELAYS.windows(2) {
            assert!(window[0] < window[1], "Normal delays must be monotonic");
        }
        for window in BACKOFF_DELAYS_SLOW.windows(2) {
            assert!(
                window[0] < window[1],
                "Aggressive delays must be monotonic"
            );
        }
    }
}
