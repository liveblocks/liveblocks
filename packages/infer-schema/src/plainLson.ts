import type { Json } from "@liveblocks/core";

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

export type { Json, JsonObject, JsonScalar } from "@liveblocks/core";

export type PlainLson =
  | PlainLsonObject
  | PlainLsonMap
  | PlainLsonList

  // Any "normal" Json value, as long as it's not an object with
  // a `liveblocksType` field :)
  | Json;
