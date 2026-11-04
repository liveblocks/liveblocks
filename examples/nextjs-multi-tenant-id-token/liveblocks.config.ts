declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    // Custom room info set with resolveRoomsInfo, for use in React
    RoomInfo: {
      id: string;
      slug: string;
      name: string;
      url: string;
    };
  }
}

export {};
