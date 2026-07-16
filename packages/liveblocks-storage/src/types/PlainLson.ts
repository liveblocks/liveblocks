/**
 * "Plain LSON" is a JSON-based format used when serializing Live structures
 * over HTTP.
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
  | Json;
