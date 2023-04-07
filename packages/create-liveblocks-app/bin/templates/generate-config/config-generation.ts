import { GenerateConfigQuestions } from "./generate-config-prompts";

export function configGeneration(args: GenerateConfigQuestions) {
  return `${imports(args)}
  
${createClient(args)}
${typeDefinitions(args)}
${reactExports(args)}
`;
}

function imports({ framework }: GenerateConfigQuestions) {
  if (framework === "react") {
    return `import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";`;
  }

  return `import { createClient } from "@liveblocks/client";`;
}

function createClient({ framework }: GenerateConfigQuestions) {
  return `${framework !== "react" ? "export " : ""}const client = createClient({
  // publicApiKey: "",
  // authEndpoint: "/api/auth",
  // throttle: 100,
});`;
}

function typeDefinitions({ typescript }: GenerateConfigQuestions) {
  if (!typescript) {
    return "";
  }
  return `
// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// \`user.presence\` property. Must be JSON-serializable.
type Presence = {
  // cursor: { x: number, y: number } | null,
  // ...
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // author: LiveObject<{ firstName: string, lastName: string }>,
  // ...
};

// Optionally, UserMeta represents static/readonly metadata on each User, as
// provided by your own custom auth backend (if used). Useful for data that
// will not change during a session, like a User's name or avatar.
// type UserMeta = {
//   id?: string,  // Accessible through \`user.id\`
//   info?: Json,  // Accessible through \`user.info\`
// };

// Optionally, the type of custom events broadcast and listened to in this
// room. Must be JSON-serializable.
// type RoomEvent = {};
`;
}

function reactExports({
  framework,
  suspense,
  typescript,
}: GenerateConfigQuestions) {
  if (framework !== "react") {
    if (typescript) {
      return `// Typed Room
export type Room = ReturnType<typeof client.enter<Presence, Storage /*, UserMeta, RoomEvent */>>;`;
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
    end =
      "createRoomContext<Presence, Storage /* UserMeta, RoomEvent */>(client);";
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
  useMutation,`;
}

function indentString(str: string) {
  return str.split(/\r?\n/).join("\n  ");
}
