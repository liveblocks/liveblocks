import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  getSlideIds,
  getSlideText,
  INITIAL_SLIDE_ID,
  slideTextKey,
  SLIDES_ARRAY_KEY,
} from "../slide-doc";

describe("slide-doc constants", () => {
  it("INITIAL_SLIDE_ID is initial and SLIDES_ARRAY_KEY is slides", () => {
    expect(INITIAL_SLIDE_ID).toBe("initial");
    expect(SLIDES_ARRAY_KEY).toBe("slides");
  });
});

describe("getSlideIds", () => {
  it("returns ids in array order and de-duplicates repeated ids", () => {
    const ydoc = new Y.Doc();
    const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);
    slides.push(["a", "b", "a", "c", "b"]);

    expect(getSlideIds(ydoc)).toEqual(["a", "b", "c"]);
  });
});

describe("getSlideText", () => {
  it("returns the Y.Text at slideTextKey for the given id", () => {
    const ydoc = new Y.Doc();
    const id = "slide-42";
    const ytext = ydoc.getText(slideTextKey(id));

    expect(getSlideText(ydoc, id)).toBe(ytext);
  });
});
