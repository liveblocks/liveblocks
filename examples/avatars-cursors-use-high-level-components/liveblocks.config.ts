declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
      };
    };
    ThreadMetadata: {
      rowId: string;
      columnId: string;
    };
  }
}

export {};
