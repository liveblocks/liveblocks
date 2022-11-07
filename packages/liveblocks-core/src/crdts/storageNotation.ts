import type { Json } from "../lib/Json";
import { isJsonObject } from "../lib/Json";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import type { Lson, LsonObject } from "./Lson";

type PlainLsonFields = Record<string, PlainLson>;

export type PlainLsonObject = {
  liveblocksType: "LiveObject";
  data: PlainLsonFields;
};

type PlainLsonMap = {
  liveblocksType: "LiveMap";
  data: PlainLsonFields;
};

type PlainLsonList = {
  liveblocksType: "LiveList";
  data: PlainLson[];
};

type PlainLson = PlainLsonObject | PlainLsonMap | PlainLsonList | Json;

export function storageNotationToLiveObject(
  root: PlainLsonObject
): LiveObject<LsonObject> {
  return dataToLiveObject(root.data);
}

function dataToLiveNode(
  data: PlainLson
): LiveObject<LsonObject> | LiveList<Lson> | LiveMap<string, Lson> | Json {
  if (isSpecialPlainLsonValue(data)) {
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

function dataToLiveMap(map: PlainLsonFields): LiveMap<string, Lson> {
  const liveMap = new LiveMap();

  for (const [subKey, subValue] of Object.entries(map)) {
    liveMap.set(subKey, dataToLiveNode(subValue));
  }

  return liveMap;
}

function dataToLiveList(list: PlainLson[]): LiveList<Lson> {
  const liveList = new LiveList();

  list.forEach((subValue) => {
    liveList.push(dataToLiveNode(subValue));
  });

  return liveList;
}

function dataToLiveObject(value: PlainLsonFields): LiveObject<LsonObject> {
  const liveObject = new LiveObject();

  for (const [subKey, subValue] of Object.entries(value)) {
    if (isSpecialPlainLsonValue(subValue)) {
      liveObject.set(subKey, dataToLiveNode(subValue));
    } else {
      liveObject.set(subKey, subValue);
    }
  }

  return liveObject;
}

function isSpecialPlainLsonValue(
  value: PlainLson
): value is PlainLsonObject | PlainLsonMap | PlainLsonList {
  return isJsonObject(value) && value.liveblocksType !== undefined;
}
