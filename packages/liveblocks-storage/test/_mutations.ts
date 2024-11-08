import type { StoreStub } from "~/index.js";
import type { Json } from "~/Json.js";

function put(stub: StoreStub, key: string, value: Json) {
  stub.set(key, value);
}

function inc(stub: StoreStub, key: string) {
  const count = stub.getNumber(key) ?? 0;
  stub.set(key, count + 1);
}

function dec(stub: StoreStub, key: string) {
  const count = stub.getNumber(key) ?? 0;
  if (count <= 0) {
    throw new Error("Cannot decrement beyond 0");
  }
  stub.set(key, count - 1);
}

// ---------------------------------------------------------------------

// Casting here necessary for now because TS cannot be certain that indeed
// these functions will be invoked on the server with the expected result!
// We'll eventually need to do runtime validation on incoming Ops for this.
export const mutations = {
  put,
  inc,
  dec,
} as const;
