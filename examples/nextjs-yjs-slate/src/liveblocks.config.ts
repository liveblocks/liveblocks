declare global {
  interface Liveblocks {
    // Optionally, UserMeta represents static/readonly metadata on each User, as
    // provided by your own custom auth backend (if used). Useful for data that
    // will not change during a session, like a User's name or avatar.
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        picture: string;
      }; // Accessible through `user.info`
    };
  }
}

export {};
