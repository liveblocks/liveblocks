declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        color: string;
        avatar: string;
      };
    };
    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      highlightId: string;
    };
  }
}

export {};
