declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        picture: string;
        color: string;
      };
    };
    RoomEvent: {
      type: "TITLE_UPDATE";
    };
  }
}

export {};
