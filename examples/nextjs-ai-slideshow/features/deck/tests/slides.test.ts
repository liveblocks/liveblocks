// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import * as Y from "yjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSlideText, INITIAL_SLIDE_ID, SLIDES_ARRAY_KEY } from "../slide-doc";
import { EMPTY_SLIDE_HTML, STARTER_SLIDE_HTML } from "../slide-html";
import { useSlideHtml, useSlides } from "../slides";

const dummyRoom = {};

let ydoc: Y.Doc;

vi.mock("@liveblocks/react/suspense", () => ({
  useRoom: () => dummyRoom,
}));

vi.mock("@liveblocks/yjs", () => ({
  getYjsProviderForRoom: () => ({
    getYDoc: () => ydoc,
    on: vi.fn(),
    off: vi.fn(),
    synced: true,
  }),
}));

beforeEach(() => {
  ydoc = new Y.Doc();
});

describe("useSlides", () => {
  it("seeds one initial slide with STARTER_SLIDE_HTML when the doc is empty on mount", async () => {
    const { result } = renderHook(() => useSlides());

    await waitFor(() => {
      expect(result.current.slideIds).toEqual([INITIAL_SLIDE_ID]);
    });
    expect(getSlideText(ydoc, INITIAL_SLIDE_ID).toString()).toBe(
      STARTER_SLIDE_HTML
    );
  });

  it("addSlide appends an 8-char id with EMPTY_SLIDE_HTML and returns the id", async () => {
    const { result } = renderHook(() => useSlides());
    await waitFor(() => expect(result.current.slideIds.length).toBe(1));

    let newId = "";
    act(() => {
      newId = result.current.addSlide();
    });

    expect(newId).toHaveLength(8);
    expect(result.current.slideIds).toContain(newId);
    expect(getSlideText(ydoc, newId).toString()).toBe(EMPTY_SLIDE_HTML);
  });

  it("deleteSlide refuses to delete the last remaining slide", async () => {
    const { result } = renderHook(() => useSlides());
    await waitFor(() => expect(result.current.slideIds).toEqual(["initial"]));

    act(() => {
      result.current.deleteSlide(INITIAL_SLIDE_ID);
    });

    expect(result.current.slideIds).toEqual([INITIAL_SLIDE_ID]);
  });

  it("deleteSlide removes a slide and every duplicate of that id when more than one exists", async () => {
    ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(["a", "b", "a"]);
    getSlideText(ydoc, "a").insert(0, "<p>a</p>");
    getSlideText(ydoc, "b").insert(0, "<p>b</p>");

    const { result } = renderHook(() => useSlides());
    await waitFor(() => expect(result.current.slideIds).toEqual(["a", "b"]));

    act(() => {
      result.current.deleteSlide("a");
    });

    expect(result.current.slideIds).toEqual(["b"]);
    expect(ydoc.getArray<string>(SLIDES_ARRAY_KEY).toArray()).toEqual(["b"]);
  });

  it("moveSlide reorders forward and backward and ignores invalid moves", async () => {
    ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(["x", "y", "z"]);

    const { result } = renderHook(() => useSlides());
    await waitFor(() =>
      expect(result.current.slideIds).toEqual(["x", "y", "z"])
    );

    act(() => {
      result.current.moveSlide(0, 2);
    });
    expect(result.current.slideIds).toEqual(["y", "z", "x"]);

    act(() => {
      result.current.moveSlide(2, 0);
    });
    expect(result.current.slideIds).toEqual(["x", "y", "z"]);

    act(() => {
      result.current.moveSlide(0, 0);
      result.current.moveSlide(-1, 0);
      result.current.moveSlide(0, 99);
    });
    expect(result.current.slideIds).toEqual(["x", "y", "z"]);
  });
});

describe("useSlideHtml", () => {
  it("returns STARTER_SLIDE_HTML for empty text and updates when Y.Text changes", async () => {
    ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(["s1"]);

    const { result } = renderHook(() => useSlideHtml("s1"));
    expect(result.current).toBe(STARTER_SLIDE_HTML);

    act(() => {
      getSlideText(ydoc, "s1").insert(0, "<p>live</p>");
    });

    await waitFor(() => {
      expect(result.current).toBe("<p>live</p>");
    });
  });
});
