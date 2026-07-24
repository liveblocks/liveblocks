import * as fc from "fast-check";

import type { Json, JsonObject } from "../../lib/Json";
import { LiveFile } from "../LiveFile";
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

interface LsonArbitraryOptions {
  /** Generates Live trees that can include LiveMaps. Defaults to true. */
  withLiveMap?: boolean;
}

const FILE_ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const storageFileId = fc
  .array(fc.integer({ min: 0, max: FILE_ID_ALPHABET.length - 1 }), {
    minLength: 21,
    maxLength: 21,
  })
  .map(
    (indices) =>
      `fl_${indices.map((index) => FILE_ID_ALPHABET.charAt(index)).join("")}`
  );

function makeLsonArbitraries(options?: LsonArbitraryOptions) {
  const withLiveMap = options?.withLiveMap ?? true;

  return fc.letrec((tie) => ({
    liveFile: fc
      .record({
        id: storageFileId,
        name: fc.string(),
        size: fc.nat({ max: Number.MAX_SAFE_INTEGER }),
        mimeType: fc.string(),
      })
      .map((data) => new LiveFile(data)),
    lson: fc.oneof(json, tie("liveStructure")).map((x) => x as Lson),
    liveStructure: fc
      .oneof(
        ...[
          tie("liveFile"),
          tie("liveList"),
          tie("liveObject"),
          ...(withLiveMap ? [tie("liveMap")] : []),
        ]
      )
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
  }));
}

export const { liveFile, liveList, liveMap, liveObject, liveStructure, lson } =
  makeLsonArbitraries();

export const { liveStructure: liveStructureWithoutMap } = makeLsonArbitraries({
  withLiveMap: false,
});
