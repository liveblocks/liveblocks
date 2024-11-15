import type { ClientStore, ServerStore } from "~/index.js";
import type { Json } from "~/lib/Json.js";
import type { LayeredCache } from "~/LayeredCache.js";

export function fmt(
  base: ClientStore<any> | ServerStore<any> | LayeredCache
): Record<string, Json> {
  return "asObject" in base ? base.asObject() : Object.fromEntries(base);
}

export function size(cache: LayeredCache): number {
  return Array.from(cache.keys()).length;
}
