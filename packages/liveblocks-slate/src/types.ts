import { LiveList, LiveObject } from "@liveblocks/client";
import type { Element, Text } from "slate";

type Concrete<T> = {
  [key in keyof T]: T[key];
};

export type LsonText = Concrete<Text>;
export type LiveText = LiveObject<LsonText>;
export type LsonElement = Omit<Element, "children"> & {
  children: LiveList<LiveDescendant>;
};
export type LiveElement = LiveObject<LsonElement>;
export type LiveDescendant = LiveText | LiveElement;
export type LiveRoot = LiveList<LiveDescendant>;
export type LiveNode = LiveDescendant | LiveRoot;
export type LiveParent = LiveElement | LiveRoot;

export type UnionToIntersection<T> = (
  T extends unknown ? (x: T) => unknown : never
) extends (x: infer R) => unknown
  ? R
  : never;

export function isLiveText(v: unknown): v is LiveText {
  return v instanceof LiveObject && typeof v.get("text") === "string";
}

export function isLiveElement(v: unknown): v is LiveElement {
  return v instanceof LiveObject && v.get("children") instanceof LiveList;
}

export function isLiveRoot(v: unknown): v is LiveRoot {
  return v instanceof LiveList;
}
