import type {
  LiveFile,
  JsonObject,
  LiveMap,
  LiveObject,
  LsonObject,
} from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      presence: JsonObject | null; // Used by tldraw
    };
    Storage: {
      records: LiveMap<string, LiveObject<LsonObject> | JsonObject>; // Used by tldraw
      files: LiveMap<string, LiveFile>;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
  }
}
