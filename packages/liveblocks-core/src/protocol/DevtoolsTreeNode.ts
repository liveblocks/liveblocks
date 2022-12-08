/**
 * This module defines data types that are used to serialize the storage and
 * presence trees for displaying in the Liveblocks browser extension.
 */

import type { Json } from "../lib/Json";

export type JsonTreeNode = {
  type: "Json";
  id: string;
  key: number | string;
  value: Json;
};

export type ObjectTreeNode = {
  type: "Object";
  id: string;
  key: number | string;
  fields: PrimitiveTreeNode[];
};

export type UserTreeNode = {
  type: "User";
  id: string;
  key: number | string;
  fields: PrimitiveTreeNode[];
};

export type LiveMapTreeNode = {
  type: "LiveMap";
  id: string;
  key: number | string;
  entries: StorageTreeNode[];
};

export type LiveListTreeNode = {
  type: "LiveList";
  id: string;
  key: number | string;
  items: StorageTreeNode[];
};

export type LiveObjectTreeNode = {
  type: "LiveObject";
  id: string;
  key: number | string;
  fields: StorageTreeNode[];
};

export type PrimitiveTreeNode = ObjectTreeNode | JsonTreeNode;

export type StorageTreeNode =
  | LiveMapTreeNode
  | LiveListTreeNode
  | LiveObjectTreeNode
  | PrimitiveTreeNode;

export type TreeNode = StorageTreeNode | UserTreeNode;
