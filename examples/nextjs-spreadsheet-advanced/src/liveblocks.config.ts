import { Presence, Storage, UserMeta } from "./types";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: Presence;
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: Storage;
    // Custom user info set when authenticating with a secret key
    UserMeta: UserMeta;
  }
}
