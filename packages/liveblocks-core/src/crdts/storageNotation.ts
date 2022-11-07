import { assertNever } from "../lib/assert";
import type { Json } from "../lib/Json";
import { isJsonObject } from "../lib/Json";
import { mapValues } from "../lib/utils";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import type { Lson, LsonObject } from "./Lson";

export type StorageNotationRoot = StorageNotationObject;

type StorageNotationFields = Record<string, StorageNotation>;

type StorageNotationObject = {
  liveblocksType: "LiveObject";
  data: StorageNotationFields;
};

type StorageNotationMap = {
  liveblocksType: "LiveMap";
  data: StorageNotationFields;
};

type StorageNotationList = {
  liveblocksType: "LiveList";
  data: StorageNotation[];
};

type StorageNotationNode =
  | StorageNotationObject
  | StorageNotationMap
  | StorageNotationList;

type StorageNotation = StorageNotationNode | Json;

export function fromStorageNotation(
  root: StorageNotationRoot
): LiveObject<LsonObject> {
  if (root.liveblocksType !== "LiveObject") {
    throw new Error("Storage root must always be a LiveObject");
  }
  return objectNotationToLson(root);
}

function storageNotationToLson(data: StorageNotation): Lson {
  if (isStorageNotationNode(data)) {
    switch (data.liveblocksType) {
      case "LiveObject":
        return objectNotationToLson(data);

      case "LiveList":
        return listNotationToLson(data);

      case "LiveMap":
        return mapNotationToLson(data);

      default:
        return assertNever(data, "Unknown `liveblocksType` field");
    }
  } else {
    return data;
  }
}

function mapNotationToLson(node: StorageNotationMap): LiveMap<string, Lson> {
  return new LiveMap(
    Object.entries(node.data).map(([key, value]) => [
      key,
      storageNotationToLson(value),
    ])
  );
}

function listNotationToLson(node: StorageNotationList): LiveList<Lson> {
  return new LiveList(node.data.map((item) => storageNotationToLson(item)));
}

function objectNotationToLson(
  node: StorageNotationObject
): LiveObject<LsonObject> {
  return new LiveObject(
    mapValues(node.data, (value) => storageNotationToLson(value))
  );
}

function isStorageNotationNode(
  value: StorageNotation
): value is StorageNotationNode {
  return isJsonObject(value) && value.liveblocksType !== undefined;
}
