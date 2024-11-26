import type { LiveObject } from "~/LiveObject.js";

import type { Json } from "./Json.js";

export type LsonObject = { [key: string]: Lson };

// XXX Add LiveList<Lson> | LiveMap<string, Lson> later
export type LiveStructure = LiveObject;

export type Lson = Json | LiveStructure;

export function isLiveStructure(value: Lson): value is LiveStructure {
  return (
    value !== null &&
    typeof value === "object" &&
    "_attach" in value &&
    typeof (value as { _attach: unknown })._attach === "function"
  );
}
