import * as fc from "fast-check";

import type { Json } from "../../lib/Json.js";
import { LiveList } from "../LiveList.js";
import { LiveMap } from "../LiveMap.js";
import { LiveObject } from "../LiveObject.js";
import type { LiveStructure, Lson } from "../Lson.js";

// NOTE: Ignoring __proto__ keys for now, there may be an issue there?
export const key = fc.string().filter((s) => s !== "__proto__");

export const json = fc
  .jsonValue()
  // Replace all -0 values inside the JSON with normal zeroes
  .map((x) => JSON.parse(JSON.stringify(x).replace(/-0/g, "0")) as Json);

export const { liveList, liveMap, liveObject, liveStructure, lson } = fc.letrec(
  (tie) => ({
    lson: fc.oneof(json, tie("liveStructure")).map((x) => x as Lson),
    liveStructure: fc
      .oneof(tie("liveList"), tie("liveMap"), tie("liveObject"))
      .map((x) => x as LiveStructure),
    liveList: fc.array(tie("lson")).map((x) => new LiveList(x as Lson[])),
    liveMap: fc
      .array(fc.tuple(key, tie("lson")))
      .map((pairs) => new LiveMap(pairs as [string, Lson][])),
    liveObject: fc
      .array(fc.tuple(key, tie("lson")))
      .map(
        (pairs) => new LiveObject(Object.fromEntries(pairs as [string, Lson][]))
      ),
  })
);
