import type { StoreStub } from "~/StoreStub.js";
import type { Json } from "~/Json.js";

export function put(stub: StoreStub, key: string, value: Json) {
  stub.set(key, value);
}

export function putRandom(stub: StoreStub, key: string) {
  stub.set(key, Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}

export function putAndFail(stub: StoreStub, key: string, value: Json) {
  put(stub, key, value);
  throw new Error("b0rked");
}

export function dupe(stub: StoreStub, src: string, target: string) {
  const value = stub.get(src);
  if (value === undefined) {
    throw new Error(`No such key '${src}'`);
  }
  stub.set(target, value);
}

export function inc(stub: StoreStub, key: string) {
  const count = stub.getNumber(key) ?? 0;
  stub.set(key, count + 1);
}

export function dec(stub: StoreStub, key: string) {
  const count = stub.getNumber(key) ?? 0;
  if (count <= 0) {
    throw new Error("Cannot decrement beyond 0");
  }
  stub.set(key, count - 1);
}
