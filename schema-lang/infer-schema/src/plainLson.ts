import type { JsonObject } from "@liveblocks/core";

export type NonLiveJsonObject = JsonObject & { liveblocksType?: never };
