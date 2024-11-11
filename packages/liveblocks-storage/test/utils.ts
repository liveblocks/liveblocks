import type { Client, Server, LayeredCache } from "~/index.js";
import type { Json } from "~/Json.js";

export function fmt(
  base: Client<any> | Server<any> | LayeredCache
): Record<string, Json> {
  const stub = "stub" in base ? base.stub : base;
  return Object.fromEntries(stub.entries());
}

export function size(base: LayeredCache): number {
  return Array.from(base.keys()).length;
}
