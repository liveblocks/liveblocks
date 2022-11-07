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
  return dataToLiveObject(root.data);
}

function dataToLiveNode(
  data: StorageNotation
): LiveObject<LsonObject> | LiveList<Lson> | LiveMap<string, Lson> | Json {
  if (isSpecialStorageNotationValue(data)) {
    switch (data.liveblocksType) {
      case "LiveObject": {
        return dataToLiveObject(data.data);
      }

      case "LiveList": {
        return dataToLiveList(data.data);
      }

      case "LiveMap": {
        return dataToLiveMap(data.data);
      }

      default:
        throw new Error("Unknown `liveblocksType` field");
    }
  } else {
    return data;
  }
}

function dataToLiveMap(map: StorageNotationFields): LiveMap<string, Lson> {
  const liveMap = new LiveMap();

  for (const [subKey, subValue] of Object.entries(map)) {
    liveMap.set(subKey, dataToLiveNode(subValue));
  }

  return liveMap;
}

function dataToLiveList(list: StorageNotation[]): LiveList<Lson> {
  const liveList = new LiveList();

  list.forEach((subValue) => {
    liveList.push(dataToLiveNode(subValue));
  });

  return liveList;
}

function dataToLiveObject(
  value: StorageNotationFields
): LiveObject<LsonObject> {
  const liveObject = new LiveObject();

  for (const [subKey, subValue] of Object.entries(value)) {
    if (isSpecialStorageNotationValue(subValue)) {
      liveObject.set(subKey, dataToLiveNode(subValue));
    } else {
      liveObject.set(subKey, subValue);
    }
  }

  return liveObject;
}

function isSpecialStorageNotationValue(
  value: StorageNotation
): value is StorageNotationObject | StorageNotationMap | StorageNotationList {
  return isJsonObject(value) && value.liveblocksType !== undefined;
}
