import type { Json } from "@liveblocks/core";

import type { InferredObjectType } from "./object";
import { isInferredObjectType } from "./object";
import type { InferredScalarType } from "./scalar";
import type { PartialBy } from "./utils/types";

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

type FieldChildContext = {
  parent: PartialBy<InferredObjectType, "fields">;
  field: string;
};

export type ChildContext = FieldChildContext & { json: boolean }; // TODO: Expand for union, list, ...

export type InferredType = InferredScalarType | InferredObjectType;

export function isAtomic(type: InferredType): boolean {
  return isInferredObjectType(type) && type.atomic;
}
