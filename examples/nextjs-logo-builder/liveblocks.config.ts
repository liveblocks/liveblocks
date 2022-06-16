import { createClient, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/auth",
});

type Presence = {
  focusedId: string | null;
};

type Theme = "light" | "dark";

type Logo = {
  name: string;
  theme: Theme;
};

type Storage = {
  logo: LiveObject<Logo>;
};

type UserMeta = {
  info: {
    name: string;
    picture: string;
  };
};

const { RoomProvider, useOthers, useUpdateMyPresence, useObject, useSelf } =
  createRoomContext<Presence, Storage, UserMeta>(client);

export { RoomProvider, useOthers, useUpdateMyPresence, useObject, useSelf };
