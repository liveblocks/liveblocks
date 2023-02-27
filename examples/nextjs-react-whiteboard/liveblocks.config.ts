@@ -0,0 +1,47 @@
import { createClient, LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
//   isTyping: boolean;
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
//   todos: LiveList<Todo>;
};

export const {
  suspense: {
    RoomProvider,
    useStorage,
    useOthers,
    useUpdateMyPresence,
    useMutation,
  },
} = createRoomContext<Presence, Storage /* UserMeta, RoomEvent */>(client);