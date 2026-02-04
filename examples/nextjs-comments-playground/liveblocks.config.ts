declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name?: string;
        avatar?: string;
      };
    };
    ThreadMetadata: {
      // Table cells
      cellId?: string;

      // Canvas pins
      x?: number;
      y?: number;
    };
  }
}

export {};
