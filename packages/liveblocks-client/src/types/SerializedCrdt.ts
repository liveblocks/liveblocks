import type { Json, JsonObject } from "./Json";

export enum CrdtType {
  OBJECT = 0,
  LIST = 1,
  MAP = 2,
  REGISTER = 3,
}

export type SerializedCrdt =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister;

export type SerializedObject = {
  type: CrdtType.OBJECT;
  parentId?: string;
  parentKey?: string;
  data: JsonObject;
};

export type SerializedList = {
  type: CrdtType.LIST;
  parentId: string;
  parentKey: string;
};

export type SerializedMap = {
  type: CrdtType.MAP;
  parentId: string;
  parentKey: string;
};

export type SerializedRegister = {
  type: CrdtType.REGISTER;
  parentId: string;
  parentKey: string;
  data: Json;
};
