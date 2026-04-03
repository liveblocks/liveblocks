declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };

    ThreadMetadata: {
      // A block node ID that the thread is attached to
      attachedToNodeId?: string;

      // Absolute coordinates when not attached, normalized 0–1 coordinates when attached to a block
      x: number;
      y: number;
    };
  }
}

export {};
