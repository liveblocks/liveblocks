import * as Y from "yjs";

export const SLIDES_ARRAY_KEY = "slides";
export const INITIAL_SLIDE_ID = "initial";

export function slideTextKey(id: string): string {
  return `slide:${id}`;
}

export function getSlideIds(ydoc: Y.Doc): string[] {
  const seen = new Set<string>();
  const slideIds: string[] = [];

  for (const id of ydoc.getArray<string>(SLIDES_ARRAY_KEY).toArray()) {
    if (!seen.has(id)) {
      seen.add(id);
      slideIds.push(id);
    }
  }

  return slideIds;
}

export function getSlideText(ydoc: Y.Doc, id: string): Y.Text {
  return ydoc.getText(slideTextKey(id));
}
