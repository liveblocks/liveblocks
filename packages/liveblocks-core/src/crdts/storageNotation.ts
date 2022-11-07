import { assertNever } from "../lib/assert";
import type { Json } from "../lib/Json";
import { isJsonObject } from "../lib/Json";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import type { Lson, LsonObject } from "./Lson";

type StorageNotationFields = Record<string, StorageNotation>;

export type StorageNotationObject = {
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

type StorageNotation =
  | StorageNotationObject
  | StorageNotationMap
  | StorageNotationList
  | Json;

export function storageNotationToLiveObject(
  root: StorageNotationObject
): LiveObject<LsonObject> {
  return fieldsToLiveObject(root.data);
}

function dataToLiveNode(
  data: StorageNotation
): LiveObject<LsonObject> | LiveList<Lson> | LiveMap<string, Lson> | Json {
  if (isSpecialStorageNotationValue(data)) {
    switch (data.liveblocksType) {
      case "LiveObject": {
        return fieldsToLiveObject(data.data);
      }

      case "LiveList": {
        return itemsToLiveList(data.data);
      }

      case "LiveMap": {
        return fieldsToLiveMap(data.data);
      }

      default:
        return assertNever(data, "Unknown `liveblocksType` field");
    }
  } else {
    return data;
  }
}

function fieldsToLiveMap(fields: StorageNotationFields): LiveMap<string, Lson> {
  const liveMap = new LiveMap();

  for (const [key, value] of Object.entries(fields)) {
    liveMap.set(key, dataToLiveNode(value));
  }

  return liveMap;
}

function itemsToLiveList(items: StorageNotation[]): LiveList<Lson> {
  const liveList = new LiveList();

  items.forEach((item) => {
    liveList.push(dataToLiveNode(item));
  });

  return liveList;
}

function fieldsToLiveObject(
  fields: StorageNotationFields
): LiveObject<LsonObject> {
  const liveObject = new LiveObject();

  for (const [key, value] of Object.entries(fields)) {
    if (isSpecialStorageNotationValue(value)) {
      liveObject.set(key, dataToLiveNode(value));
    } else {
      liveObject.set(key, value);
    }
  }

  return liveObject;
}

function isSpecialStorageNotationValue(
  value: StorageNotation
): value is StorageNotationObject | StorageNotationMap | StorageNotationList {
  return isJsonObject(value) && value.liveblocksType !== undefined;
}
