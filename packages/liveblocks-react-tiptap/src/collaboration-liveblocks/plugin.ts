import {
  createLiveblocksCollaborationPlugin,
  LIVEBLOCKS_COLLABORATION_PLUGIN_KEY,
  type LiveblocksProsemirrorRoom,
  type ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";
import type { Content } from "@tiptap/core";
import { Extension } from "@tiptap/core";

import { createDefaultDocument } from "./schema";

export { LIVEBLOCKS_COLLABORATION_PLUGIN_KEY };

type LiveblocksCollaborationOptions = {
  room?: LiveblocksProsemirrorRoom;
  field: string;
  initialContent?: Content;
};

type LiveblocksCollaborationStorage = {
  isDisabled: boolean;
};

function isProseMirrorJsonNode(value: unknown): value is ProseMirrorJsonNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    collaboration: {
      undo: () => ReturnType;
      redo: () => ReturnType;
    };
  }
}

export const LiveblocksCollaboration = Extension.create<
  LiveblocksCollaborationOptions,
  LiveblocksCollaborationStorage
>({
  name: "collaboration",
  priority: 1000,

  addOptions() {
    return {
      room: undefined,
      field: "default",
      initialContent: undefined,
    };
  },

  addStorage() {
    return {
      isDisabled: false,
    };
  },

  addCommands() {
    return {
      undo:
        () =>
        ({ dispatch, tr }) => {
          tr.setMeta("preventDispatch", true);

          if (
            this.options.room === undefined ||
            !this.options.room.history.canUndo()
          ) {
            return false;
          }

          if (dispatch) {
            this.options.room.history.undo();
          }

          return true;
        },
      redo:
        () =>
        ({ dispatch, tr }) => {
          tr.setMeta("preventDispatch", true);

          if (
            this.options.room === undefined ||
            !this.options.room.history.canRedo()
          ) {
            return false;
          }

          if (dispatch) {
            this.options.room.history.redo();
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Mod-y": () => this.editor.commands.redo(),
      "Shift-Mod-z": () => this.editor.commands.redo(),
    };
  },

  addProseMirrorPlugins() {
    return [
      createLiveblocksCollaborationPlugin({
        room: this.options.room,
        field: this.options.field,
        initialContent: isProseMirrorJsonNode(this.options.initialContent)
          ? this.options.initialContent
          : undefined,
        fallbackDocument: createDefaultDocument,
      }),
    ];
  },
});
