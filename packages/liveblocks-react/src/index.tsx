if (process.env.NODE_ENV !== "production") {
  const pkg = "@liveblocks/react";
  const format =
    "__PACKAGE_FORMAT__" === "__PACKAGE" + /* don't join */ "_FORMAT__"
      ? "ESM"
      : "__PACKAGE_FORMAT__";
  const g = globalThis as typeof globalThis & { [key: string]: string };
  if (g && g[pkg] !== format) {
    if (g[pkg] === undefined) {
      g[pkg] = format;
    } else {
      console.warn(
        `${pkg} appears twice in your bundle (as ${g[pkg]} and ${format}). This can lead to hard-to-debug problems. Please see XXX for details.`
      );
    }
  }
}

export { LiveblocksProvider, useClient } from "./client";

export { createRoomContext } from "./factory";

export {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useBroadcastEvent,
  useErrorListener,
  useEventListener,
  useSelf,
  useStorage,
  useMap,
  useList,
  useObject,
  useUndo,
  useRedo,
  useBatch,
  useHistory,
} from "./compat";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
