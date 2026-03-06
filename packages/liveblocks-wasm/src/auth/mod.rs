pub mod token;

use serde::{Deserialize, Serialize};

use token::{AuthToken, ParsedAuthToken};

/// The result of authentication — either a secret token or a public API key.
#[derive(Debug, Clone, PartialEq)]
pub enum AuthValue {
    Secret { token: ParsedAuthToken },
    Public { public_api_key: String },
}

/// Requested scope for auth.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RequestedScope {
    RoomRead,
    CommentsRead,
}

/// Permission scopes matching the TypeScript Permission enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Permission {
    #[serde(rename = "room:read")]
    Read,
    #[serde(rename = "room:write")]
    Write,
    #[serde(rename = "room:presence:write")]
    PresenceWrite,
    #[serde(rename = "comments:write")]
    CommentsWrite,
    #[serde(rename = "comments:read")]
    CommentsRead,
}

/// Infers from the given scopes whether the user can write storage.
pub fn can_write_storage(scopes: &[String]) -> bool {
    scopes.iter().any(|s| s == "room:write")
}

/// Infers from the given scopes whether the user can comment.
pub fn can_comment(scopes: &[String]) -> bool {
    scopes.iter().any(|s| s == "comments:write" || s == "room:write")
}

/// HTTP status codes that should NOT be retried during auth.
pub const NON_RETRY_STATUS_CODES: &[u16] = &[
    400, 401, 403, 404, 405, 410, 412, 414, 422, 431, 451,
];

/// Buffer in seconds for early token expiry.
const EXPIRY_BUFFER_SECS: i64 = 30;

/// AuthManager manages token caching and expiry.
///
/// It does NOT perform actual HTTP requests or auth callbacks. Instead, it
/// provides cache management. The actual auth request is performed by the
/// platform adapter (native or WASM) and passed back via `cache_token()`.
#[derive(Debug)]
pub struct AuthManager {
    tokens: Vec<ParsedAuthToken>,
    expiry_times: Vec<i64>,
    seen_raw_tokens: std::collections::HashSet<String>,
}

impl AuthManager {
    pub fn new() -> Self {
        Self {
            tokens: Vec::new(),
            expiry_times: Vec::new(),
            seen_raw_tokens: std::collections::HashSet::new(),
        }
    }

    /// Reset all cached tokens.
    pub fn reset(&mut self) {
        self.tokens.clear();
        self.expiry_times.clear();
        self.seen_raw_tokens.clear();
    }

    /// Cache a parsed token. Returns an error if the token was already seen.
    pub fn cache_token(
        &mut self,
        token: ParsedAuthToken,
        now_secs: i64,
    ) -> Result<(), &'static str> {
        if self.seen_raw_tokens.contains(&token.raw) {
            return Err("The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported.");
        }

        let expiry = now_secs + (token.parsed.exp() - token.parsed.iat()) - EXPIRY_BUFFER_SECS;

        self.seen_raw_tokens.insert(token.raw.clone());
        self.tokens.push(token);
        self.expiry_times.push(expiry);
        Ok(())
    }

    /// Look up a cached token matching the requested scope and room.
    pub fn get_cached_token(
        &mut self,
        requested_scope: RequestedScope,
        room_id: Option<&str>,
        now_secs: i64,
    ) -> Option<&ParsedAuthToken> {
        // Remove expired tokens
        let mut i = self.tokens.len();
        while i > 0 {
            i -= 1;
            if self.expiry_times[i] <= now_secs {
                self.tokens.remove(i);
                self.expiry_times.remove(i);
            }
        }

        // Search from most recent
        for token in self.tokens.iter().rev() {
            match &token.parsed {
                AuthToken::IdToken(_) => {
                    // ID tokens are user-level, always match
                    return Some(token);
                }
                AuthToken::AccessToken(acc) => {
                    // Check permission matching
                    if room_id.is_none() && acc.perms.is_empty() {
                        return Some(token);
                    }

                    for (resource, scopes) in &acc.perms {
                        if room_id.is_none() {
                            if resource.contains('*')
                                && has_corresponding_scopes(requested_scope, scopes)
                            {
                                return Some(token);
                            }
                        } else if let Some(rid) = room_id {
                            let resource_matches = if resource.contains('*') {
                                rid.starts_with(&resource.replace('*', ""))
                            } else {
                                rid == resource
                            };

                            if resource_matches
                                && has_corresponding_scopes(requested_scope, scopes)
                            {
                                return Some(token);
                            }
                        }
                    }
                }
            }
        }

        None
    }
}

impl Default for AuthManager {
    fn default() -> Self {
        Self::new()
    }
}

fn has_corresponding_scopes(requested: RequestedScope, scopes: &[Permission]) -> bool {
    match requested {
        RequestedScope::CommentsRead => scopes.iter().any(|s| {
            matches!(
                s,
                Permission::CommentsRead
                    | Permission::CommentsWrite
                    | Permission::Read
                    | Permission::Write
            )
        }),
        RequestedScope::RoomRead => {
            scopes
                .iter()
                .any(|s| matches!(s, Permission::Read | Permission::Write))
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use super::*;
    use super::token::*;

    fn make_access_token(perms: HashMap<String, Vec<Permission>>, iat: i64, exp: i64) -> ParsedAuthToken {
        ParsedAuthToken {
            raw: format!("header.{}.sig", iat), // unique per iat
            parsed: AuthToken::AccessToken(AccessToken {
                k: TokenKind::AccessToken,
                pid: "proj-1".to_string(),
                uid: "user-1".to_string(),
                perms,
                ui: None,
                iat,
                exp,
            }),
        }
    }

    fn make_id_token(iat: i64, exp: i64) -> ParsedAuthToken {
        ParsedAuthToken {
            raw: format!("header.{}.sig", iat),
            parsed: AuthToken::IdToken(IdToken {
                k: TokenKind::IdToken,
                pid: "proj-1".to_string(),
                uid: "user-1".to_string(),
                gids: None,
                ui: None,
                iat,
                exp,
            }),
        }
    }

    #[test]
    fn test_cache_and_lookup_id_token() {
        let mut mgr = AuthManager::new();
        let token = make_id_token(1000, 2000);
        mgr.cache_token(token, 1000).unwrap();

        let found = mgr.get_cached_token(RequestedScope::RoomRead, Some("room-1"), 1500);
        assert!(found.is_some());
    }

    #[test]
    fn test_expired_token_removed() {
        let mut mgr = AuthManager::new();
        let token = make_id_token(1000, 1060); // Expires at iat + (exp-iat) - 30 = 1000 + 60 - 30 = 1030
        mgr.cache_token(token, 1000).unwrap();

        // At time 1031, token should be expired
        let found = mgr.get_cached_token(RequestedScope::RoomRead, Some("room-1"), 1031);
        assert!(found.is_none());
    }

    #[test]
    fn test_duplicate_token_rejected() {
        let mut mgr = AuthManager::new();
        let token = make_id_token(1000, 2000);
        let token2 = token.clone();
        mgr.cache_token(token, 1000).unwrap();
        let result = mgr.cache_token(token2, 1000);
        assert!(result.is_err());
    }

    #[test]
    fn test_access_token_permission_matching() {
        let mut mgr = AuthManager::new();
        let mut perms = HashMap::new();
        perms.insert("room-1".to_string(), vec![Permission::Write]);

        let token = make_access_token(perms, 1000, 2000);
        mgr.cache_token(token, 1000).unwrap();

        // Matching room
        let found = mgr.get_cached_token(RequestedScope::RoomRead, Some("room-1"), 1500);
        assert!(found.is_some());

        // Non-matching room
        let found = mgr.get_cached_token(RequestedScope::RoomRead, Some("room-2"), 1500);
        assert!(found.is_none());
    }

    #[test]
    fn test_access_token_wildcard_matching() {
        let mut mgr = AuthManager::new();
        let mut perms = HashMap::new();
        perms.insert("room-*".to_string(), vec![Permission::Read]);

        let token = make_access_token(perms, 1000, 2000);
        mgr.cache_token(token, 1000).unwrap();

        let found = mgr.get_cached_token(RequestedScope::RoomRead, Some("room-123"), 1500);
        assert!(found.is_some());

        let found = mgr.get_cached_token(RequestedScope::RoomRead, Some("other-123"), 1500);
        assert!(found.is_none());
    }

    #[test]
    fn test_reset_clears_all() {
        let mut mgr = AuthManager::new();
        let token = make_id_token(1000, 2000);
        mgr.cache_token(token, 1000).unwrap();
        assert!(mgr.get_cached_token(RequestedScope::RoomRead, None, 1500).is_some());

        mgr.reset();
        assert!(mgr.get_cached_token(RequestedScope::RoomRead, None, 1500).is_none());
    }

    #[test]
    fn test_can_write_storage() {
        assert!(can_write_storage(&["room:write".to_string()]));
        assert!(!can_write_storage(&["room:read".to_string()]));
        assert!(!can_write_storage(&[]));
    }

    #[test]
    fn test_can_comment() {
        assert!(can_comment(&["comments:write".to_string()]));
        assert!(can_comment(&["room:write".to_string()]));
        assert!(!can_comment(&["room:read".to_string()]));
        assert!(!can_comment(&["comments:read".to_string()]));
    }
}
