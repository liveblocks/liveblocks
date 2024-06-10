declare global {
  interface Liveblocks {
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
