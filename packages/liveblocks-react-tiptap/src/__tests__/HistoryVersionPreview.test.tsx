import type { HistoryVersion } from "@liveblocks/core";
import type { Editor } from "@tiptap/react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useHistoryVersionStorageData: vi.fn(() => ({ isLoading: true })),
  useHistoryVersionYjsData: vi.fn(() => ({ isLoading: true })),
}));

vi.mock("@liveblocks/react", () => ({
  useHistoryVersionStorageData: mocks.useHistoryVersionStorageData,
  useHistoryVersionYjsData: mocks.useHistoryVersionYjsData,
}));

vi.mock("@liveblocks/prosemirror", () => ({
  getLiveblocksProsemirrorDocument: vi.fn(),
  liveblocksProsemirrorNodeToJson: vi.fn(),
}));

vi.mock("@liveblocks/react-ui", () => ({
  useOverrides: () => ({
    HISTORY_VERSION_PREVIEW_AUTHORS_LIST: (value: unknown) => value,
    HISTORY_VERSION_PREVIEW_ERROR: (error: Error) => error.message,
    HISTORY_VERSION_PREVIEW_RESTORE: "Restore",
    LIST_REMAINING_USERS: () => "",
    locale: "en",
  }),
}));

vi.mock("@liveblocks/react-ui/_private", () => ({
  Button: "button",
  List: "span",
  RestoreIcon: "span",
  SpinnerIcon: "span",
  User: "span",
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
}));

vi.mock("@tiptap/react", () => ({
  EditorContent: "div",
  useEditor: () => null,
}));

import { HistoryVersionPreview } from "../version-history/HistoryVersionPreview";

const version: HistoryVersion = {
  id: "vh_test",
  authors: [],
  createdAt: new Date(),
};

function createEditor(mode: "liveblocks" | "yjs"): Editor {
  // The component only reads these editor properties before its preview editor
  // is created; constructing a real Tiptap editor would obscure the source test.
  return {
    extensionManager: { extensions: [] },
    storage: {
      liveblocksExtension: {
        mode,
        field: "custom",
        unsubs: [],
      },
    },
  } as unknown as Editor;
}

afterEach(() => {
  mocks.useHistoryVersionStorageData.mockClear();
  mocks.useHistoryVersionYjsData.mockClear();
  document.body.innerHTML = "";
});

describe("HistoryVersionPreview", () => {
  test("loads Storage history in Liveblocks collaboration mode", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <HistoryVersionPreview
          editor={createEditor("liveblocks")}
          version={version}
        />
      );
    });

    expect(mocks.useHistoryVersionStorageData).toHaveBeenCalledWith("vh_test");
    expect(mocks.useHistoryVersionYjsData).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  test("keeps loading Yjs history in Yjs collaboration mode", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <HistoryVersionPreview editor={createEditor("yjs")} version={version} />
      );
    });

    expect(mocks.useHistoryVersionYjsData).toHaveBeenCalledWith("vh_test");
    expect(mocks.useHistoryVersionStorageData).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
