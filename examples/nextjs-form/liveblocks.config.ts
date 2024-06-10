import { LiveObject } from "@liveblocks/client";

type Theme = "light" | "dark";

type Logo = {
  name: string;
  theme: Theme;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      focusedId: string | null;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      logo: LiveObject<Logo>;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        avatar: string;
      };
    };
  }
}
