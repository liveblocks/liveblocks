declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: {
        x: number;
        y: number;
      } | null;
      message: string;
    };
    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {
      x: number;
      y: number;
      value: string;
    };
  }
}

export {};
