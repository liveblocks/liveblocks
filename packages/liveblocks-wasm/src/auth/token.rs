//! JWT token parsing for Liveblocks auth tokens.
//!
//! Mirrors `packages/liveblocks-core/src/protocol/AuthToken.ts`.
//! Performs base64url decode of the middle JWT segment (no signature verification).

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use super::Permission;

/// Token kind discriminant matching the TypeScript TokenKind enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TokenKind {
    #[serde(rename = "acc")]
    AccessToken,
    #[serde(rename = "id")]
    IdToken,
}

/// Access Token payload.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AccessToken {
    pub k: TokenKind,
    pub pid: String,
    pub uid: String,
    pub perms: HashMap<String, Vec<Permission>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ui: Option<JsonValue>,
    pub iat: i64,
    pub exp: i64,
}

/// ID Token payload.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IdToken {
    pub k: TokenKind,
    pub pid: String,
    pub uid: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ui: Option<JsonValue>,
    pub iat: i64,
    pub exp: i64,
}

/// A parsed auth token — either Access or ID.
#[derive(Debug, Clone, PartialEq)]
pub enum AuthToken {
    AccessToken(AccessToken),
    IdToken(IdToken),
}

impl AuthToken {
    pub fn iat(&self) -> i64 {
        match self {
            AuthToken::AccessToken(t) => t.iat,
            AuthToken::IdToken(t) => t.iat,
        }
    }

    pub fn exp(&self) -> i64 {
        match self {
            AuthToken::AccessToken(t) => t.exp,
            AuthToken::IdToken(t) => t.exp,
        }
    }

    pub fn uid(&self) -> &str {
        match self {
            AuthToken::AccessToken(t) => &t.uid,
            AuthToken::IdToken(t) => &t.uid,
        }
    }

    pub fn pid(&self) -> &str {
        match self {
            AuthToken::AccessToken(t) => &t.pid,
            AuthToken::IdToken(t) => &t.pid,
        }
    }

    pub fn user_info(&self) -> Option<&JsonValue> {
        match self {
            AuthToken::AccessToken(t) => t.ui.as_ref(),
            AuthToken::IdToken(t) => t.ui.as_ref(),
        }
    }
}

/// The rich parsed token with both raw string and parsed payload.
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedAuthToken {
    pub raw: String,
    pub parsed: AuthToken,
}

/// Parse a raw JWT token string. Decodes the payload (middle segment)
/// from base64url, but does NOT verify the signature (matches JS behavior).
pub fn parse_auth_token(raw: &str) -> Result<ParsedAuthToken, String> {
    let parts: Vec<&str> = raw.split('.').collect();
    if parts.len() != 3 {
        return Err("Authentication error: invalid JWT token".to_string());
    }

    let payload_bytes = base64url_decode(parts[1])
        .map_err(|e| format!("Authentication error: failed to decode JWT payload: {e}"))?;

    let payload_str = String::from_utf8(payload_bytes)
        .map_err(|e| format!("Authentication error: JWT payload is not valid UTF-8: {e}"))?;

    let payload: JsonValue = serde_json::from_str(&payload_str)
        .map_err(|e| format!("Authentication error: JWT payload is not valid JSON: {e}"))?;

    let obj = payload.as_object().ok_or_else(|| {
        "Authentication error: expected a valid token but did not get one.".to_string()
    })?;

    let kind = obj
        .get("k")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            "Authentication error: expected a valid token but did not get one.".to_string()
        })?;

    let parsed = match kind {
        "acc" => {
            let token: AccessToken = serde_json::from_value(payload)
                .map_err(|e| format!("Authentication error: failed to parse access token: {e}"))?;
            AuthToken::AccessToken(token)
        }
        "id" => {
            let token: IdToken = serde_json::from_value(payload)
                .map_err(|e| format!("Authentication error: failed to parse ID token: {e}"))?;
            AuthToken::IdToken(token)
        }
        other => {
            return Err(format!(
                "Authentication error: unknown token kind '{other}'"
            ));
        }
    };

    Ok(ParsedAuthToken {
        raw: raw.to_string(),
        parsed,
    })
}

/// Decode a base64url-encoded string (no padding required).
fn base64url_decode(input: &str) -> Result<Vec<u8>, String> {
    // base64url uses - instead of + and _ instead of /
    let standard: String = input
        .chars()
        .map(|c| match c {
            '-' => '+',
            '_' => '/',
            c => c,
        })
        .collect();

    // Add padding if needed
    let padded = match standard.len() % 4 {
        2 => format!("{standard}=="),
        3 => format!("{standard}="),
        0 => standard,
        _ => return Err("Invalid base64url length".to_string()),
    };

    // Use a simple base64 decoder
    decode_base64(&padded)
}

/// Simple base64 decoder (no external dependency for the core path).
fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    fn lookup(c: u8) -> Result<u8, String> {
        TABLE
            .iter()
            .position(|&b| b == c)
            .map(|p| p as u8)
            .ok_or_else(|| format!("Invalid base64 character: {}", c as char))
    }

    let bytes: Vec<u8> = input.bytes().filter(|&b| b != b'=').collect();
    let mut output = Vec::with_capacity(bytes.len() * 3 / 4);

    for chunk in bytes.chunks(4) {
        let mut buf = [0u8; 4];
        let len = chunk.len();
        for (i, &b) in chunk.iter().enumerate() {
            buf[i] = lookup(b)?;
        }

        if len >= 2 {
            output.push((buf[0] << 2) | (buf[1] >> 4));
        }
        if len >= 3 {
            output.push((buf[1] << 4) | (buf[2] >> 2));
        }
        if len >= 4 {
            output.push((buf[2] << 6) | buf[3]);
        }
    }

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Create a fake JWT with the given payload JSON.
    fn make_jwt(payload: &str) -> String {
        let header = base64url_encode(b"{\"alg\":\"HS256\"}");
        let payload_enc = base64url_encode(payload.as_bytes());
        let sig = base64url_encode(b"fakesig");
        format!("{header}.{payload_enc}.{sig}")
    }

    fn base64url_encode(input: &[u8]) -> String {
        const TABLE: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        let mut output = String::new();
        for chunk in input.chunks(3) {
            let b0 = chunk[0] as u32;
            let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
            let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
            let triple = (b0 << 16) | (b1 << 8) | b2;

            output.push(TABLE[((triple >> 18) & 0x3f) as usize] as char);
            output.push(TABLE[((triple >> 12) & 0x3f) as usize] as char);
            if chunk.len() > 1 {
                output.push(TABLE[((triple >> 6) & 0x3f) as usize] as char);
            }
            if chunk.len() > 2 {
                output.push(TABLE[(triple & 0x3f) as usize] as char);
            }
        }

        // Convert to base64url (no padding)
        output
            .replace('+', "-")
            .replace('/', "_")
            .trim_end_matches('=')
            .to_string()
    }

    #[test]
    fn test_parse_access_token() {
        let payload = r#"{"k":"acc","pid":"proj_1","uid":"user_1","perms":{"room-1":["room:write"]},"iat":1000,"exp":2000}"#;
        let jwt = make_jwt(payload);
        let result = parse_auth_token(&jwt).unwrap();

        match &result.parsed {
            AuthToken::AccessToken(t) => {
                assert_eq!(t.pid, "proj_1");
                assert_eq!(t.uid, "user_1");
                assert_eq!(t.iat, 1000);
                assert_eq!(t.exp, 2000);
                assert!(t.perms.contains_key("room-1"));
            }
            other => panic!("Expected AccessToken, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_id_token() {
        let payload = r#"{"k":"id","pid":"proj_1","uid":"user_1","gids":["g1","g2"],"iat":1000,"exp":2000}"#;
        let jwt = make_jwt(payload);
        let result = parse_auth_token(&jwt).unwrap();

        match &result.parsed {
            AuthToken::IdToken(t) => {
                assert_eq!(t.pid, "proj_1");
                assert_eq!(t.uid, "user_1");
                assert_eq!(t.gids, Some(vec!["g1".to_string(), "g2".to_string()]));
            }
            other => panic!("Expected IdToken, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_invalid_jwt_format() {
        let result = parse_auth_token("not.a.valid.jwt.with.too.many.parts");
        assert!(result.is_err());

        let result = parse_auth_token("only-one-part");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_invalid_payload() {
        let header = base64url_encode(b"{}");
        let payload = base64url_encode(b"not json");
        let jwt = format!("{header}.{payload}.sig");
        let result = parse_auth_token(&jwt);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_unknown_token_kind() {
        let payload = r#"{"k":"unknown","pid":"p","uid":"u","iat":0,"exp":0}"#;
        let jwt = make_jwt(payload);
        let result = parse_auth_token(&jwt);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unknown token kind"));
    }

    #[test]
    fn test_auth_token_accessors() {
        let payload = r#"{"k":"acc","pid":"proj_1","uid":"user_1","perms":{},"iat":100,"exp":200,"ui":{"name":"Alice"}}"#;
        let jwt = make_jwt(payload);
        let result = parse_auth_token(&jwt).unwrap();

        assert_eq!(result.parsed.iat(), 100);
        assert_eq!(result.parsed.exp(), 200);
        assert_eq!(result.parsed.uid(), "user_1");
        assert_eq!(result.parsed.pid(), "proj_1");
        assert!(result.parsed.user_info().is_some());
    }

    #[test]
    fn test_base64url_decode_roundtrip() {
        let original = b"Hello, World!";
        let encoded = base64url_encode(original);
        let decoded = base64url_decode(&encoded).unwrap();
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_base64url_decode_with_special_chars() {
        // Test that +/= are properly handled
        let data = vec![0xFF, 0xFE, 0xFD, 0xFC];
        let encoded = base64url_encode(&data);
        assert!(!encoded.contains('+'));
        assert!(!encoded.contains('/'));
        assert!(!encoded.contains('='));
        let decoded = base64url_decode(&encoded).unwrap();
        assert_eq!(decoded, data);
    }
}
