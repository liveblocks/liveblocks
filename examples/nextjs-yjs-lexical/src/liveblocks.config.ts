declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        picture: string;
        color: string;
      }; // Accessible through `user.info`
    };
  }
}

export {};
