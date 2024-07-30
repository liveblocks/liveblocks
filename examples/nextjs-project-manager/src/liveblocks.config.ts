import { LiveObject } from "@liveblocks/core";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    Storage: {
      meta: LiveObject<{
        title: string;
      }>;
    };
    RoomEvent: {
      type: "ROOM_UPDATED";
      roomId: string;
    };
    RoomData: {
      metadata: {
        label: string[];
      };
    };
  }
}
