declare global {
  interface Liveblocks {
    // Event types
    RoomEvent: {
      type: "TOAST";
      message: string;
    };
  }
}

export {};
