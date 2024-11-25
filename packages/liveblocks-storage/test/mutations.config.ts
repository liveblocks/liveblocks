import type { Json } from "~/lib/Json.js";
import type { Transaction } from "~/types.js";

export function put(root: Transaction, key: string, value: Json): void {
  root.set("root", key, value);
}

export function del(root: Transaction, key: string): void {
  root.delete("root", key);
}

export function clear(root: Transaction): void {
  for (const key of root.keys()) {
    root.delete("root", key);
  }
}

export function putRandom(root: Transaction, key: string): void {
  root.set("root", key, Math.floor(Math.random() * 1_000_000));
}

export function putAndFail(root: Transaction, key: string, value: Json): void {
  put(root, key, value);
  throw new Error("b0rked");
}

export function fail(): void {
  throw new Error("I will always fail");
}

export function dupe(root: Transaction, src: string, target: string): void {
  const value = root.get("root", src);
  if (value === undefined) {
    throw new Error(`No such key '${src}'`);
  }
  root.set("root", target, value);
}

export function inc(root: Transaction, key: string): void {
  const count = root.getNumber("root", key) ?? 0;
  root.set("root", key, count + 1);
}

export function putAndInc(root: Transaction, key: string, value: number): void {
  root.set("root", key, value);
  root.set("root", key, (root.get("root", key) as number) + 1);
}

export function dec(root: Transaction, key: string): void {
  const count = root.getNumber("root", key) ?? 0;
  if (count <= 0) {
    throw new Error("Cannot decrement beyond 0");
  }
  root.set("root", key, count - 1);
}
