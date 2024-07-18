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
    Storage: {
      title: string;
      lastModified: number;
    };
  }
}

export {};
