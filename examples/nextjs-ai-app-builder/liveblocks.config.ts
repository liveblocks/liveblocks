declare global {
  interface Liveblocks {
    Storage: {
      code: string;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };
  }
}

export {};
