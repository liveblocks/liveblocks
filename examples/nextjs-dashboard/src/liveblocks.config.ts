type CursorPosition = {
  x: number;
  y: number;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      selectedDataset: { cardId: string; dataKey: string } | null;
      cursor: CursorPosition | null;
      cardId: string | null;
    };
  }
}

export {};
