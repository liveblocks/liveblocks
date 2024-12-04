import * as fc from "fast-check";

import type { Json, JsonObject } from "~/lib/Json.js";
import type { LiveStructure, Lson } from "~/lib/Lson.js";
import { LiveObject } from "~/LiveObject.js";

// NOTE: Ignoring __proto__ keys for now, there may be an issue there?
export const key = fc.string().filter((s) => s !== "__proto__");

export const json = fc
  .jsonValue()
  // Replace all -0 values inside the JSON with normal zeroes
  .map((x) => JSON.parse(JSON.stringify(x).replace(/-0/g, "0")) as Json);

export const jsonObject = json
  .filter(
    (j): j is JsonObject =>
      typeof j === "object" && j !== null && !Array.isArray(j)
  )
  // It will filter out __proto__ keys from the passed in object
  .filter((o) => !Object.hasOwnProperty.call(o, "__proto__"));

export const {
  lson,
  liveStructure,
  liveObject,
  // liveList,
  // liveMap,
} = fc.letrec((tie) => ({
  lson: fc.oneof(json, tie("liveStructure")).map((x) => x as Lson),
  liveStructure: fc
    .oneof(
      // tie("liveList"),
      // tie("liveMap"),
      tie("liveObject")
    )
    .map((x) => x as LiveStructure),
  // liveList: fc.array(tie("lson")).map((x) => new LiveList(x as Lson[])),
  // liveMap: fc
  //   .array(fc.tuple(key, tie("lson")))
  //   .map((pairs) => new LiveMap(pairs as [string, Lson][])),
  liveObject: fc
    .array(fc.tuple(key, tie("lson")))
    .map(
      (pairs) => new LiveObject(Object.fromEntries(pairs as [string, Lson][]))
    ),
}));
