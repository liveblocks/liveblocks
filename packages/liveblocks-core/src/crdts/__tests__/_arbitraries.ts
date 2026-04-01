import * as fc from "fast-check";

import type { Json, JsonObject } from "../../lib/Json";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";
import type { LiveStructure, Lson } from "../Lson";

export const key = fc.string().filter((s) => s !== "__proto__");

export const json = fc
  .jsonValue()
  .map((x) => JSON.stringify(x).replace(/-0/g, "0")) // Replace all -0 values inside the JSON with normal zeroes
  .filter((s) => !s.includes("__proto__"))
  .map((s) => JSON.parse(s) as Json);

export const jsonObject: fc.Arbitrary<JsonObject> = fc.dictionary(key, json);

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
