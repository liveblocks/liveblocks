declare global {
  interface Liveblocks {
    ThreadMetadata: {
      anchor: string;
      head: string;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        picture: string;
        color: string;
      };
    };
  }
}

export {};
