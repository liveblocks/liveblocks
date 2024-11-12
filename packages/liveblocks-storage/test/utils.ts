import type { Client, Server } from "~/index.js";
import type { Json } from "~/Json.js";
import type { LayeredCache } from "~/LayeredCache.js";

export function fmt(
  base: Client<any> | Server<any> | LayeredCache
): Record<string, Json> {
  const cache = "cache" in base ? base.cache : base;
  return Object.fromEntries(cache.entries());
}

export function size(cache: LayeredCache): number {
  return Array.from(cache.keys()).length;
}
