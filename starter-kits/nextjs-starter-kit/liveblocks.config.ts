import {
  LiveMap,
  LiveObject,
  ThreadData,
  createClient,
} from "@liveblocks/client";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";
import Router from "next/router";
import { DOCUMENT_URL } from "@/constants";
import { authorizeLiveblocks, getSpecificDocuments } from "@/lib/actions";
import { getUsers } from "./lib/database";
import { User } from "./types";

// Creating client with a custom callback that calls our API
// In this API we'll assign each user custom data, such as names, avatars
// If any client side data is needed to get user info from your system,
// (e.g. auth token, user id) send it in the body alongside `room`.
// This is using a Next.js server action called `authorizeLiveblocks`
const client = createClient({
  authEndpoint: async () => {
    const { data, error } = await authorizeLiveblocks();

    if (error) {
      Router.push({
        query: {
          ...Router.query,
          error: encodeURIComponent(JSON.stringify(error)),
        },
      });
      return;
    }

    return data;
  },

  // Resolve user IDs into name/avatar/etc for Comments/Notifications
  async resolveUsers({ userIds }) {
    const users = await getUsers({ userIds });
    return users.map((user) => user || {});
  },

  // Resolve a mention suggestion into a userId e.g. `@tat` → `tatum.paolo@example.com`
  async resolveMentionSuggestions({ text }) {
    const users = await getUsers({ search: text });
    return users.map((user) => user?.id || "");
  },

  // Resolve a room ID into room information for Notifications
  async resolveRoomsInfo({ roomIds }) {
    const documents = await getSpecificDocuments({ documentIds: roomIds });
    return documents.map((document) => ({
      name: document ? document.name : undefined,
      url: document ? DOCUMENT_URL(document.type, document.id) : undefined,
    }));
  },
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
export type Presence = {
  cursor: { x: number; y: number } | null;
};

export type Note = LiveObject<{
  x: number;
  y: number;
  text: string;
  selectedBy: UserMeta["info"] | null;
  id: string;
}>;

export type Notes = LiveMap<string, Note>;

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  notes: Notes;
};

export type UserInfo = Pick<User, "name" | "avatar" | "color">;

// Optionally, UserMeta represents static/readonly metadata on each User, as
// provided by your own custom auth backend (if used). Useful for data that
// will not change during a session, like a User's name or avatar.
export type UserMeta = {
  info: UserInfo;
};

// Optionally, the type of custom events broadcast and listened for in this
// room. Must be JSON-serializable.
type RoomEvent = {
  type: "SHARE_DIALOG_UPDATE";
};

type ThreadMetadata = {
  resolved: boolean;
  highlightId: string;
};

export type CustomThreadData = ThreadData<ThreadMetadata>;
export const {
  suspense: {
    RoomProvider,
    useBroadcastEvent,
    useEventListener,
    useHistory,
    useCanUndo,
    useCanRedo,
    useCreateThread,
    useMutation,
    useOthers,
    useRoom,
    useSelf,
    useStorage,
    useThreads,
    useUpdateMyPresence,
    useUser,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(
  client
);

export const {
  suspense: {
    LiveblocksProvider,
    useInboxNotifications,
    useUnreadInboxNotificationsCount,
    useMarkAllInboxNotificationsAsRead,
  },
} = createLiveblocksContext(client);
