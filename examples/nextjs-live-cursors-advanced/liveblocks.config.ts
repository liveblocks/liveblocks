declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      cursor: { x: number; y: number } | null;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        color: [string, string];
        avatar?: string;
      };
    };
  }
}

export {};
