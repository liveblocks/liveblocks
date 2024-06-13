declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      cursor: { x: number; y: number } | null;
    };
  }
}

export {};
