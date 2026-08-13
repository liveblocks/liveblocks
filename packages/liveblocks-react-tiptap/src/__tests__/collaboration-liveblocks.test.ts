import { type AnyExtension, Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    createLiveblocksCollaborationPlugin: vi.fn(),
    createLiveblocksCollaborationCaretPlugin: vi.fn(),
  };
});

vi.mock("@liveblocks/prosemirror", () => {
  return {
    LIVEBLOCKS_COLLABORATION_PLUGIN_KEY: new PluginKey(
      "liveblocks-collaboration"
    ),
    LIVEBLOCKS_CARET_PLUGIN_KEY: new PluginKey(
      "liveblocks-collaboration-caret"
    ),
    createLiveblocksCollaborationPlugin:
      mocks.createLiveblocksCollaborationPlugin,
    createLiveblocksCollaborationCaretPlugin:
      mocks.createLiveblocksCollaborationCaretPlugin,
    getCursorUser(value: unknown) {
      if (typeof value !== "object" || value === null) {
        return undefined;
      }

      const user = value as { name?: unknown; color?: unknown };
      const name = typeof user.name === "string" ? user.name : undefined;
      const color = typeof user.color === "string" ? user.color : undefined;
      return name !== undefined || color !== undefined
        ? { name, color }
        : undefined;
    },
    presencePatch({
      field,
      anchor,
      head,
      user,
    }: {
      field: string;
      anchor: number;
      head: number;
      user?: { name?: string; color?: string };
    }) {
      return {
        liveblocksTiptap: {
          field,
          anchor,
          head,
          ...(user !== undefined ? { user } : {}),
        },
      };
    },
  };
});

import { LiveblocksCollaborationCaret } from "../collaboration-liveblocks/cursors";
import { LiveblocksCollaboration } from "../collaboration-liveblocks/plugin";

type CollaborationPluginOptions = {
  fallbackDocument: () => unknown;
};

function createRoom() {
  return {
    batch(callback: () => void) {
      callback();
    },
    getOthers: () => [],
    getStorage: () => Promise.reject(new Error("Unexpected storage access")),
    history: {
      canUndo: vi.fn(() => true),
      canRedo: vi.fn(() => true),
      disable: <T>(callback: () => T) => callback(),
      pause: vi.fn(),
      resume: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    },
    subscribe: vi.fn(() => () => {}),
    updatePresence: vi.fn(),
    events: {
      others: {
        subscribe: vi.fn(() => () => {}),
      },
    },
  };
}

function createEditor(extensions: AnyExtension[]) {
  return new Editor({
    extensions: [Document, Paragraph, Text, ...(extensions ?? [])],
    content: "<p>Hello</p>",
  });
}

describe("Liveblocks ProseMirror Tiptap adapters", () => {
  beforeEach(() => {
    mocks.createLiveblocksCollaborationPlugin.mockReset();
    mocks.createLiveblocksCollaborationCaretPlugin.mockReset();
    mocks.createLiveblocksCollaborationPlugin.mockReturnValue(new Plugin({}));
    mocks.createLiveblocksCollaborationCaretPlugin.mockReturnValue(
      new Plugin({})
    );
  });

  test("passes field, initialContent, and Tiptap fallback document to the collaboration plugin", () => {
    const room = createRoom();
    const initialContent = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
    const editor = createEditor([
      LiveblocksCollaboration.configure({
        room,
        field: "custom",
        initialContent,
      }),
    ]);

    expect(mocks.createLiveblocksCollaborationPlugin).toHaveBeenCalledWith({
      room,
      field: "custom",
      initialContent,
      fallbackDocument: expect.any(Function),
    });
    const options = mocks.createLiveblocksCollaborationPlugin.mock
      .calls[0]?.[0] as CollaborationPluginOptions | undefined;
    expect(options?.fallbackDocument()).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });

    editor.destroy();
  });

  test("keeps undo and redo wired to Liveblocks room history", () => {
    const room = createRoom();
    const editor = createEditor([LiveblocksCollaboration.configure({ room })]);

    expect(editor.commands.undo()).toBe(true);
    expect(room.history.resume).toHaveBeenCalledTimes(1);
    expect(room.history.undo).toHaveBeenCalledTimes(1);

    expect(editor.commands.redo()).toBe(true);
    expect(room.history.resume).toHaveBeenCalledTimes(2);
    expect(room.history.redo).toHaveBeenCalledTimes(1);

    editor.destroy();
  });

  test("passes caret options and storage to the extracted caret plugin", () => {
    const room = createRoom();
    const editor = createEditor([
      LiveblocksCollaborationCaret.configure({
        room,
        field: "custom",
        user: { name: "Ada", color: "#f00" },
      }),
    ]);

    expect(mocks.createLiveblocksCollaborationCaretPlugin).toHaveBeenCalledWith(
      expect.objectContaining({
        room,
        field: "custom",
        user: { name: "Ada", color: "#f00" },
      }),
      expect.objectContaining({ users: [] })
    );

    editor.destroy();
  });

  test("keeps updateUser wired to Liveblocks presence", () => {
    const room = createRoom();
    const editor = createEditor([
      LiveblocksCollaborationCaret.configure({ room }),
    ]);

    expect(editor.commands.updateUser({ name: "Ada", color: "#f00" })).toBe(
      true
    );
    expect(room.updatePresence).toHaveBeenCalledWith({
      liveblocksTiptap: {
        field: "default",
        anchor: 1,
        head: 1,
        user: { name: "Ada", color: "#f00" },
      },
    });

    editor.destroy();
  });
});
