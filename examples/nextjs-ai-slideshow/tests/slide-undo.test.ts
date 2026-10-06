// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import * as Y from "yjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSlideText, SLIDES_ARRAY_KEY } from "@/app/slide-doc";
import { useSlideUndo, VISUAL_EDIT_ORIGIN } from "@/app/slide-undo";

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

describe("useSlideUndo", () => {
  it("makes visual edits undoable and redoable", async () => {
    ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(["s1"]);
    const ytext = getSlideText(ydoc, "s1");
    ytext.insert(0, "before");

    const { result } = renderHook(() => useSlideUndo());

    act(() => {
      ydoc.transact(() => {
        ytext.insert(ytext.length, "-edit");
      }, VISUAL_EDIT_ORIGIN);
    });

    await waitFor(() => {
      expect(result.current.canUndo).toBe(true);
    });
    expect(ytext.toString()).toBe("before-edit");

    act(() => {
      result.current.undo();
    });
    expect(ytext.toString()).toBe("before");
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(ytext.toString()).toBe("before-edit");
  });

  it("does not treat edits without origin as undoable", async () => {
    ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(["s1"]);
    const ytext = getSlideText(ydoc, "s1");
    ytext.insert(0, "x");

    const { result } = renderHook(() => useSlideUndo());

    act(() => {
      ydoc.transact(() => {
        ytext.insert(1, "y");
      });
    });

    await waitFor(() => {
      expect(result.current.canUndo).toBe(false);
    });
  });

  it("tracks slides added to the array after mount", async () => {
    ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(["first"]);
    const { result } = renderHook(() => useSlideUndo());

    act(() => {
      ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(["late"]);
    });

    const lateText = getSlideText(ydoc, "late");
    act(() => {
      ydoc.transact(() => {
        lateText.insert(0, "late-edit");
      }, VISUAL_EDIT_ORIGIN);
    });

    await waitFor(() => {
      expect(result.current.canUndo).toBe(true);
    });

    act(() => {
      result.current.undo();
    });
    expect(lateText.toString()).toBe("");
  });
});
