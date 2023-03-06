import { LiveList, LiveObject, Lson } from "@liveblocks/client";
import { assert } from "@liveblocks/core";
import { Descendant, Element, Text } from "slate";
import {
  isLiveElement,
  isLiveText,
  LiveDescendant,
  LiveElement,
  LiveRoot,
  LiveText,
  LsonElement,
  LsonText,
} from "../types";

export function lsonToSlateNode(lson: Lson): Descendant {
  assert(isLiveElement(lson) || isLiveText(lson), "LSON isn't a live node");
  return lson.toImmutable() as Descendant;
}

export function slateTextToLiveText(text: Text): LiveText {
  return new LiveObject<LsonText>(text);
}

export function slateElementToLiveElement(element: Element): LiveElement {
  const { children, ...attributes } = element;
  return new LiveObject<LsonElement>({
    ...attributes,
    children: new LiveList(children.map(slateDescendantToLiveDescendant)),
  });
}

export function slateDescendantToLiveDescendant(
  descendant: Descendant
): LiveDescendant {
  if (Text.isText(descendant)) {
    return slateTextToLiveText(descendant);
  }

  return slateElementToLiveElement(descendant);
}

export function slateRootToLiveRoot(slateRoot: Descendant[]): LiveRoot {
  return new LiveList(slateRoot.map(slateDescendantToLiveDescendant));
}

export function cloneLiveDescendant(
  LiveDescendant: LiveDescendant
): LiveDescendant {
  return slateDescendantToLiveDescendant(
    LiveDescendant.toImmutable() as Descendant
  );
}
