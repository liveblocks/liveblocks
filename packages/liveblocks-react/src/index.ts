const pkgName = "@liveblocks/react";
const pkgVersion =
  (typeof __PACKAGE_VERSION__ === "string" && __PACKAGE_VERSION__) || "dev";
const pkgFormat = (typeof TSUP_FORMAT === "string" && TSUP_FORMAT) || "esm";

// Detect if duplicate copies of Liveblocks are being loaded
import { detectDupes } from "@liveblocks/core";
detectDupes(pkgName, pkgVersion, pkgFormat);

declare const __PACKAGE_VERSION__: string;
declare const TSUP_FORMAT: string;

// -------------------------------------

export { ClientSideSuspense } from "./ClientSideSuspense";
export { createRoomContext } from "./factory";
export type { MutationContext } from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";
