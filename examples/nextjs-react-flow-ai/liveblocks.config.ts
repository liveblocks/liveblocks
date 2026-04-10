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

    Presence: {
      thinking?: boolean;
    };
  }
}

export {};
