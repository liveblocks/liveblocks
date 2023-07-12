// Detect if duplicate copies of Liveblocks are being loaded
import { detectDupes } from "@liveblocks/core";

declare const PKG_NAME: string;
declare const PKG_VERSION: string;
declare const TSUP_FORMAT: string;
detectDupes(PKG_NAME, PKG_VERSION, TSUP_FORMAT);

// -------------------------------------

export { ClientSideSuspense } from "./ClientSideSuspense";
export { createRoomContext } from "./factory";
export type { MutationContext } from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";
