import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 30,
});

export type AccurateCursorPositions = {
  cursorSelectors: string[];
  cursorX: number;
  cursorY: number;
};

export type DragOffset = {
  x: number;
  y: number;
};

// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  cursor: AccurateCursorPositions | null;
  editingText: `${string}/${string}` | null;
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // author: LiveObject<{ firstName: string, lastName: string }>,
  // ...
};

// Optionally, UserMeta represents static/readonly metadata on each user, as
// provided by your own custom auth back end (if used). Useful for data that
// will not change during a session, like a user's name or avatar.
export type UserMeta = {
  id: string; // Accessible through `user.id`
  info: {
    name: string;
    color: string;
    avatar: string;
  }; // Accessible through `user.info`
};

// Optionally, the type of custom events broadcast and listened to in this
// room. Use a union for multiple events. Must be JSON-serializable.
type RoomEvent = {};

// Metadata attached to comments
export type ThreadMetadata = {
  resolved: boolean;
  zIndex: number;

  // AccurateCursorPositions["cursorSelectors"].toString()
  cursorSelectors: string;
  cursorX: AccurateCursorPositions["cursorX"];
  cursorY: AccurateCursorPositions["cursorY"];
};

export const {
  suspense: {
    RoomProvider,
    useThreads,
    useCreateThread,
    useCreateComment,
    useDeleteComment,
    useEditComment,
    useUser,
    useEditThreadMetadata,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useObject,
    useMap,
    useList,
    useBatch,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(
  client,
  {
    async resolveUsers({ userIds }) {
      const searchParams = new URLSearchParams(
        userIds.map((userId) => ["userIds", userId])
      );
      const response = await fetch(`/api/users?${searchParams}`);

      if (!response.ok) {
        throw new Error("Problem resolving user");
      }

      const users = await response.json();
      return users;
    },
    async resolveMentionSuggestions({ text }) {
      const response = await fetch(
        `/api/users/search?text=${encodeURIComponent(text)}`
      );

      if (!response.ok) {
        throw new Error("Problem resolving user");
      }

      const userIds = await response.json();
      return userIds;
    },
  }
);
