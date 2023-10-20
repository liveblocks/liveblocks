import { InitQuestions } from "./init-prompts";

export function configGeneration(args: InitQuestions) {
  return `${imports(args)}
  
${createClient(args)}
${typeDefinitions(args)}
${reactExports(args)}
`;
}

function imports({ framework, typescript }: InitQuestions) {
  if (framework === "react") {
    return `import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";`;
  }

  if (typescript) {
    return `import { createClient, type Room } from "@liveblocks/client";`;
  }

  return `import { createClient } from "@liveblocks/client";`;
}

function createClient({ framework, comments }: InitQuestions) {
  const options = comments
    ? `{
  // publicApiKey: "",
  // authEndpoint: "/api/auth",
  // throttle: 100,
}`
    : `{}`;
  return `${
    framework !== "react" ? "export " : ""
  }const client = createClient(${options});`;
}

function typeDefinitions({ typescript, comments }: InitQuestions) {
  if (!typescript) {
    return "";
  }

  if (!comments) {
    return `
type Presence = {};
type Storage = {};
type UserMeta = {};
type RoomEvent = {};
`;
  }

  return `
// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the
// \`user.presence\` property. Must be JSON-serializable.
type Presence = {
  // cursor: { x: number, y: number } | null,
  // ...
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
type UserMeta = {
  // id?: string,  // Accessible through \`user.id\`
  // info?: Json,  // Accessible through \`user.info\`
};

// Optionally, the type of custom events broadcast and listened to in this
// room. Use a union for multiple events. Must be JSON-serializable.
type RoomEvent = {
  // type: "NOTIFICATION",
  // ...
};
`;
}

function reactExports({ framework, suspense, typescript }: InitQuestions) {
  if (framework !== "react") {
    if (typescript) {
      return `export type TypedRoom = Room<Presence, Storage, UserMeta, RoomEvent>;`;
    }
    return "";
  }

  let start;

  if (suspense) {
    start = `export const {
  suspense: {
    ${indentString(allHooks())}
  }
} = `;
  } else {
    start = `export const {
  ${allHooks()} 
} = `;
  }

  let end;

  if (typescript) {
    end = "createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);";
  } else {
    end = "createRoomContext(client);";
  }

  return start + end;
}

function allHooks() {
  return `RoomProvider,
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
  useThreads,
  useUser,
  useCreateThread,
  useEditThreadMetadata,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useAddReaction,
  useRemoveReaction,`;
}

function indentString(str: string) {
  return str.split(/\r?\n/).join("\n  ");
}
