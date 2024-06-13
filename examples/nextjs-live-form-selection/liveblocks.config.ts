declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      selectedId: string | null;
    };
  }
}

export {};
