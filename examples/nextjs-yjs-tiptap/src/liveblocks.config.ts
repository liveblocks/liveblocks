declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: { cursor: { x: number; y: number } | null };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        picture: string;
      }; // Accessible through `user.info`
    };
  }
}

export {};
