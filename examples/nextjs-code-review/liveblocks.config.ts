declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    ThreadMetadata: {
      filePath: string;
      lineContent: string;
      contextBefore: string;
      contextAfter: string;
      lineNumber: number;
    };
  }
}

export {};
