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
      lineNumber: number;
      side: "deletions" | "additions";
    };
  }
}

export {};
