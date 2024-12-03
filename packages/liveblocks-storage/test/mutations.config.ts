import type { Json } from "~/lib/Json.js";
import { isLiveStructure } from "~/lib/Lson.js";
import { LiveObject } from "~/LiveObject.js";

export function put(root: LiveObject, key: string, value: Json): void {
  root.set(key, value);
}

export function del(root: LiveObject, key: string): void {
  root.delete(key);
}

export function putRandom(root: LiveObject, key: string): void {
  root.set(key, Math.floor(Math.random() * 1_000_000));
}

export function putAndFail(root: LiveObject, key: string, value: Json): void {
  put(root, key, value);
  throw new Error("b0rked");
}

export function fail(): void {
  throw new Error("I will always fail");
}

export function dupe(root: LiveObject, src: string, target: string): void {
  const value = root.get(src);
  if (value === undefined) {
    throw new Error(`No such key '${src}'`);
  }
  root.set(target, value);
}

export function inc(root: LiveObject, key: string): void {
  const count = getNumber(root, key) ?? 0;
  root.set(key, count + 1);
}

export function putAndInc(root: LiveObject, key: string, value: number): void {
  root.set(key, value);
  root.set(key, (root.get(key) as number) + 1);
}

export function dec(root: LiveObject, key: string): void {
  const count = getNumber(root, key) ?? 0;
  if (count <= 0) {
    throw new Error("Cannot decrement beyond 0");
  }
  root.set(key, count - 1);
}

export function setLiveObject(
  root: LiveObject,
  key1: string,
  key2: string,
  value: Json
): void {
  root.set(key1, new LiveObject({ [key2]: value }));
}

export function putLiveObject(
  root: LiveObject,
  key: string,
  value: Json
): void {
  root.set(key, new LiveObject({ [key]: value }));
}

// --- Helpers ---------------------------------------------------------------

function getNumber(root: LiveObject, key: string): number | undefined {
  const value = root.get(key);
  return typeof value === "number" ? value : undefined;
}
