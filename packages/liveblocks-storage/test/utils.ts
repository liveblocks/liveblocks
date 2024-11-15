import type { Client, Server } from "~/index.js";
import type { LayeredCache } from "~/LayeredCache.js";
import type { Json } from "~/lib/Json.js";

export function fmt(
  /* eslint-disable @typescript-eslint/no-explicit-any */
  base: Client<any> | Server<any> | LayeredCache
  /* eslint-enable @typescript-eslint/no-explicit-any */
): Record<string, Json> {
  return "asObject" in base ? base.asObject() : Object.fromEntries(base);
}

export function size(cache: LayeredCache): number {
  return Array.from(cache.keys()).length;
}
