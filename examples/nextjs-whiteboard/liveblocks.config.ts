import { createClient, LiveMap } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.LIVEBLOCKS_PUBLIC_KEY as string,
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  selectedShape: string | null;
};

type Shape = {
  x: number | undefined;
  y: number | undefined;
  fill: string | undefined;
  id: string | undefined;
};

type Storage = {
  shapes: LiveMap<string, Shape>;
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.

export const {
  suspense: {
    RoomProvider,
    useStorage,
    useOthers,
    useMutation,
    useHistory,
    useSelf,
  },
} = createRoomContext<Presence, Storage /* UserMeta, RoomEvent */>(client);
