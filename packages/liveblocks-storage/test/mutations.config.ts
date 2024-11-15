import type { LayeredCache as Stub } from "~/LayeredCache.js";
import type { Json } from "~/lib/Json.js";

export function put(stub: Stub, key: string, value: Json): void {
  stub.set(key, value);
}

export function putRandom(stub: Stub, key: string): void {
  stub.set(key, Math.floor(Math.random() * 1_000_000));
}

export function putAndFail(stub: Stub, key: string, value: Json): void {
  put(stub, key, value);
  throw new Error("b0rked");
}

export function dupe(stub: Stub, src: string, target: string): void {
  const value = stub.get(src);
  if (value === undefined) {
    throw new Error(`No such key '${src}'`);
  }
  stub.set(target, value);
}

export function inc(stub: Stub, key: string): void {
  const count = stub.getNumber(key) ?? 0;
  stub.set(key, count + 1);
}

export function dec(stub: Stub, key: string): void {
  const count = stub.getNumber(key) ?? 0;
  if (count <= 0) {
    throw new Error("Cannot decrement beyond 0");
  }
  stub.set(key, count - 1);
}
