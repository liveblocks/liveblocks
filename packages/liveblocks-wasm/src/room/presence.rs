//! Presence management.
//!
//! Mirrors the presence model from room.ts:
//! - MyPresence: the local user's presence (patch-based updates)
//! - Others: map of other connected users (connectionId -> presence + info)
//!
//! An "other" user is only visible when BOTH their connection and presence
//! data have been received (via ROOM_STATE + UPDATE_PRESENCE).

use std::collections::HashMap;

use serde_json::Value as JsonValue;

/// Represents another connected user.
#[derive(Debug, Clone)]
pub struct OtherUser {
    pub connection_id: i32,
    pub presence: JsonValue,
    pub info: Option<JsonValue>,
    pub scopes: Vec<String>,
    /// Whether we've received this user's presence data.
    pub has_presence: bool,
}

/// Manages local and remote presence.
pub struct PresenceManager {
    my_presence: JsonValue,
    others: HashMap<i32, OtherUser>,
}

impl PresenceManager {
    pub fn new(initial_presence: JsonValue) -> Self {
        Self {
            my_presence: initial_presence,
            others: HashMap::new(),
        }
    }

    /// Get the local user's presence.
    pub fn my_presence(&self) -> &JsonValue {
        &self.my_presence
    }

    /// Update the local user's presence with a patch (shallow merge).
    pub fn update_my_presence(&mut self, patch: JsonValue) {
        if let (Some(current), Some(update)) = (self.my_presence.as_object_mut(), patch.as_object())
        {
            for (key, value) in update {
                current.insert(key.clone(), value.clone());
            }
        }
    }

    /// Set the local user's presence completely (replace).
    pub fn set_my_presence(&mut self, presence: JsonValue) {
        self.my_presence = presence;
    }

    /// Handle ROOM_STATE: set up connection entries for all users.
    /// `users` maps connectionId -> userInfo JSON (which includes a `scopes` field).
    pub fn handle_room_state(&mut self, users: HashMap<i32, JsonValue>) {
        // Clear existing others
        self.others.clear();

        for (connection_id, info) in users {
            // Extract scopes from the user info object
            let scopes = info
                .get("scopes")
                .and_then(|s| s.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();

            self.others.insert(
                connection_id,
                OtherUser {
                    connection_id,
                    presence: JsonValue::Null,
                    info: Some(info),
                    scopes,
                    has_presence: false,
                },
            );
        }
    }

    /// Handle USER_JOINED: add a new user connection.
    /// If the user already exists (e.g. from a prior UPDATE_PRESENCE that arrived
    /// before the USER_JOINED), update their info and scopes but preserve existing presence.
    pub fn handle_user_joined(&mut self, connection_id: i32, info: JsonValue, scopes: Vec<String>) {
        let user = self.others.entry(connection_id).or_insert_with(|| OtherUser {
            connection_id,
            presence: JsonValue::Null,
            info: None,
            scopes: Vec::new(),
            has_presence: false,
        });
        user.info = Some(info);
        user.scopes = scopes;
    }

    /// Handle USER_LEFT: remove a user.
    pub fn handle_user_left(&mut self, connection_id: i32) -> Option<OtherUser> {
        self.others.remove(&connection_id)
    }

    /// Handle UPDATE_PRESENCE: update a user's presence.
    /// Returns true if this was the first presence for this user (they become visible).
    pub fn handle_update_presence(
        &mut self,
        connection_id: i32,
        data: JsonValue,
        is_full: bool,
    ) -> bool {
        let user = self.others.entry(connection_id).or_insert_with(|| OtherUser {
            connection_id,
            presence: JsonValue::Null,
            info: None,
            scopes: Vec::new(),
            has_presence: false,
        });
        let was_visible = user.has_presence;

        if is_full {
            user.presence = data;
        } else if user.presence.is_null() {
            // First partial update when presence is null — use as initial data
            user.presence = data;
        } else if let (Some(current), Some(patch)) =
            (user.presence.as_object_mut(), data.as_object())
        {
            for (key, value) in patch {
                current.insert(key.clone(), value.clone());
            }
        }

        user.has_presence = true;
        !was_visible // Return true if this is the first presence (newly visible)
    }

    /// Get all visible others (users with both connection and presence data).
    /// Sorted by connection_id for consistent ordering.
    pub fn visible_others(&self) -> Vec<&OtherUser> {
        let mut others: Vec<_> = self.others
            .values()
            .filter(|u| u.has_presence)
            .collect();
        others.sort_by_key(|u| u.connection_id);
        others
    }

    /// Get all others as JSON array (for the getOthers() API).
    pub fn others_as_json(&self) -> JsonValue {
        let others: Vec<JsonValue> = self
            .visible_others()
            .iter()
            .map(|u| {
                let mut obj = serde_json::Map::new();
                obj.insert("connectionId".to_string(), JsonValue::from(u.connection_id));
                obj.insert("presence".to_string(), u.presence.clone());

                // Compute isReadOnly, canWrite, canComment from scopes
                let has_scope = |scope: &str| -> bool {
                    u.scopes.iter().any(|s| s == scope)
                };
                let can_write = has_scope("room:write");
                obj.insert("isReadOnly".to_string(), JsonValue::from(!can_write));
                obj.insert("canWrite".to_string(), JsonValue::from(can_write));
                obj.insert("canComment".to_string(), JsonValue::from(
                    can_write || has_scope("room:comment"),
                ));

                if let Some(info) = &u.info {
                    // Expose user info fields (id, name, etc.) at top level
                    if let Some(info_obj) = info.as_object() {
                        for (key, value) in info_obj {
                            if key != "scopes" {
                                obj.insert(key.clone(), value.clone());
                            }
                        }
                    }
                }

                JsonValue::Object(obj)
            })
            .collect();
        JsonValue::Array(others)
    }

    /// Clear all others (on disconnect).
    pub fn clear_others(&mut self) {
        self.others.clear();
    }

    /// Get a specific other user by connection ID.
    pub fn get_other(&self, connection_id: i32) -> Option<&OtherUser> {
        self.others.get(&connection_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_initial_presence() {
        let mgr = PresenceManager::new(json!({"cursor": null}));
        assert_eq!(mgr.my_presence(), &json!({"cursor": null}));
    }

    #[test]
    fn test_update_my_presence_patch() {
        let mut mgr = PresenceManager::new(json!({"cursor": null, "color": "red"}));
        mgr.update_my_presence(json!({"cursor": {"x": 10, "y": 20}}));
        assert_eq!(
            mgr.my_presence(),
            &json!({"cursor": {"x": 10, "y": 20}, "color": "red"})
        );
    }

    #[test]
    fn test_others_visibility() {
        let mut mgr = PresenceManager::new(json!({}));

        // User joins but has no presence yet — not visible
        mgr.handle_user_joined(1, json!({"name": "Alice"}), vec!["room:write".to_string()]);
        assert!(mgr.visible_others().is_empty());

        // User sends presence — now visible
        let became_visible =
            mgr.handle_update_presence(1, json!({"cursor": null}), true);
        assert!(became_visible);
        assert_eq!(mgr.visible_others().len(), 1);

        // Second update — already visible
        let became_visible =
            mgr.handle_update_presence(1, json!({"cursor": {"x": 1}}), false);
        assert!(!became_visible);
    }

    #[test]
    fn test_user_left_removes_from_others() {
        let mut mgr = PresenceManager::new(json!({}));
        mgr.handle_user_joined(1, json!({}), vec![]);
        mgr.handle_update_presence(1, json!({"x": 1}), true);
        assert_eq!(mgr.visible_others().len(), 1);

        let removed = mgr.handle_user_left(1);
        assert!(removed.is_some());
        assert!(mgr.visible_others().is_empty());
    }

    #[test]
    fn test_room_state_sets_up_connections() {
        let mut mgr = PresenceManager::new(json!({}));
        let mut users = HashMap::new();
        users.insert(1, json!({"name": "Alice"}));
        users.insert(2, json!({"name": "Bob"}));

        mgr.handle_room_state(users);
        // Not visible yet (no presence)
        assert!(mgr.visible_others().is_empty());

        // Alice sends presence
        mgr.handle_update_presence(1, json!({"cursor": null}), true);
        assert_eq!(mgr.visible_others().len(), 1);
    }

    #[test]
    fn test_clear_others() {
        let mut mgr = PresenceManager::new(json!({}));
        mgr.handle_user_joined(1, json!({}), vec![]);
        mgr.handle_update_presence(1, json!({}), true);
        assert_eq!(mgr.visible_others().len(), 1);

        mgr.clear_others();
        assert!(mgr.visible_others().is_empty());
    }
}
