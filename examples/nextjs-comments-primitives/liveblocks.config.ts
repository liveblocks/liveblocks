declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name?: string;
        avatar?: string;
      };
    };

    // Custom metadata set on threads
    ThreadMetadata: {
      assignee?: string;
    };

    // Custom metadata set on comments
    CommentMetadata: {
      userAgent: string;
    };
  }
}

export {};
