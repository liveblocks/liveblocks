import type {
  JsonArray,
  JsonObject as BaseJsonObject,
  JsonScalar,
} from "@liveblocks/core";

export type PlainLsonFields = Record<string, PlainLson> & {
  liveblocksType?: never;
};

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

export type JsonObject = BaseJsonObject & { liveblocksType?: never };
export type { JsonArray, JsonScalar } from "@liveblocks/core";
export type Json = JsonScalar | JsonArray | JsonObject;

export type PlainLson = PlainLsonObject | PlainLsonMap | PlainLsonList | Json;
