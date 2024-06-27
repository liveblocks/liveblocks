declare global {
  interface Liveblocks {
    // Presence type
    Presence: {
      cursor: { x: number; y: number } | null;
    };
  }
}

export {};
