/**
 * This module defines data types that are used to serialize the storage and
 * presence trees for displaying in the Liveblocks browser extension.
 */

import type { Json } from "../lib/Json";

export type JsonPropNode = {
  type: "Json";
  id: string;
  name: number | string; // XXX Rename to `key`
  data: Json; // XXX Rename to `value`
};

export type LiveStructureTreeNode = {
  type: "LiveMap" | "LiveList" | "LiveObject";
  id: string;
  name: number | string; // XXX Rename to `key`
  children: StorageTreeNode[];
};

export type StorageTreeNode = LiveStructureTreeNode | JsonPropNode;

export type UserTreeNode = {
  type: "User";
  id: string;
  name: number | string; // XXX Rename to `key`
  info: Json;
  children: JsonPropNode[]; // XXX <- This contains all the Json properties
};

// XXX Do we still need this type for anything?
// export type PresenceTreeNode = UserTreeNode | JsonPropNode;
