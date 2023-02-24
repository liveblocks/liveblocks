/**
 * "Plain LSON" is a JSON-based format that's used in the API endpoint to let
 * users upload their initial Room storage.
 *
 * In the client, you would typically create LSON values using:
 *
 *    new LiveObject({ x: 0, y: 0 })
 *
 * But over HTTP, this has to be serialized somehow. The "Plain LSON" format
 * is what's used in the POST /init-storage-new endpoint, to allow users to
 * control which parts of their data structure should be considered "Live"
 * objects, and which parts are "normal" objects.
 *
 * So if they have a structure like:
 *
 *    { x: 0, y: 0 }
 *
 * And want to make it a Live object, they can serialize it by wrapping it in
 * a special "annotation":
 *
 *    {
 *      "liveblocksType": "LiveObject",
 *      "data": { x: 0, y: 0 },
 *    }
 *
 * This "Plain LSON" data format defines exactly those wrappings.
 *
 * To summarize:
 *
 *   LSON value            |  Plain LSON equivalent
 *   ----------------------+----------------------------------------------
 *   42                    |  42
 *   [1, 2, 3]             |  [1, 2, 3]
 *   { x: 0, y: 0 }        |  { x: 0, y: 0 }
 *   ----------------------+----------------------------------------------
 *   new LiveList(...)     |  { liveblocksType: "LiveList",   data: ... }
 *   new LiveMap(...)      |  { liveblocksType: "LiveMap",    data: ... }
 *   new LiveObject(...)   |  { liveblocksType: "LiveObject", data: ... }
 *
 */

import type { Json } from "../lib/Json";

export type PlainLsonFields = Record<string, PlainLson>;

export type PlainLsonObject = {
  liveblocksType: "LiveObject";
  data: PlainLsonFields;
};

export type PlainLsonMap = {
  liveblocksType: "LiveMap";
  data: PlainLsonFields;
};

export type PlainLsonList = {
  liveblocksType: "LiveList";
  data: PlainLson[];
};

export type PlainLson =
  | PlainLsonObject
  | PlainLsonMap
  | PlainLsonList

  // Any "normal" Json value, as long as it's not an object with
  // a `liveblocksType` field :)
  | Json;
