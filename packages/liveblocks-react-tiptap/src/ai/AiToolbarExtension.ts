import { Extension } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ySyncPluginKey } from "y-prosemirror";

import type { AiToolbarExtensionStorage } from "../types";
import { AI_TOOLBAR_SELECTION_PLUGIN } from "../types";

export const AiToolbarExtension = Extension.create<
  never,
  AiToolbarExtensionStorage
>({
  name: "liveblocksAiToolbar",
  priority: 95,

  addStorage() {
    return {
      state: "closed",
      selection: undefined,
      prompt: undefined,
      previousPrompt: undefined,
    };
  },

  addCommands() {
    return {
      askAi: (prompt) => () => {
        if (this.storage.state === "closed") {
          // If there's no selection yet, put the selection at the start of the document
          if (this.editor.state.selection.$from.depth === 0) {
            this.editor.chain().focus().setTextSelection(0).run();
          }

          // If the selection is collapsed, select the whole current block
          if (this.editor.state.selection.empty) {
            const { $from } = this.editor.state.selection;
            const start = $from.start();
            const end = $from.end();
            this.editor.commands.setTextSelection({ from: start, to: end });
          }

          this.editor.commands.blur();
        }

        const selection =
          this.storage.selection ??
          new TextSelection(
            this.editor.state.selection.$anchor,
            this.editor.state.selection.$head
          );

        this.storage.state = prompt ? "thinking" : "asking";
        this.storage.selection = selection;
        this.storage.prompt = prompt ?? this.storage.prompt ?? "";

        return true;
      },
      retryAskAi: () => () => {
        if (this.storage.state !== "reviewing") {
          return false;
        }

        this.storage.state = "thinking";
        this.storage.prompt = this.storage.previousPrompt ?? "";
        this.storage.previousPrompt = undefined;

        return true;
      },
      cancelAskAi: () => () => {
        if (this.storage.state !== "thinking") {
          return false;
        }

        this.storage.state = "asking";

        return true;
      },
      reviewAi: () => () => {
        if (this.storage.state !== "thinking") {
          return false;
        }

        this.storage.state = "reviewing";
        this.storage.previousPrompt = this.storage.prompt;
        this.storage.prompt = "";

        return true;
      },
      closeAi: () => () => {
        this.storage.state = "closed";
        this.storage.selection = undefined;
        this.storage.prompt = undefined;
        this.storage.previousPrompt = undefined;

        return true;
      },
      setAiPrompt: (prompt) => () => {
        if (this.storage.state === "closed") {
          return false;
        }

        this.storage.prompt =
          typeof prompt === "function" ? prompt(this.storage.prompt) : prompt;

        return true;
      },
    };
  },

  //@ts-expect-error - this is incorrectly typed upstream in Mark.ts of TipTap. This event does include transaction
  // correct: https://github.com/ueberdosis/tiptap/blob/2ff327ced84df6865b4ef98947b667aa79992292/packages/core/src/types.ts#L60
  // incorrect: https://github.com/ueberdosis/tiptap/blob/2ff327ced84df6865b4ef98947b667aa79992292/packages/core/src/Mark.ts#L330
  onSelectionUpdate(
    this: { storage: Storage }, // NOTE: there are more types here I didn't override, this gets removed after submitting PR to tiptap
    { transaction }: { transaction: Transaction } // TODO: remove this after submitting PR to tiptap
  ) {
    // ignore changes made by yjs
    if (!this.storage.selection || transaction.getMeta(ySyncPluginKey)) {
      return;
    }
    this.storage.selection = undefined;
  },
  // TODO: this.storage.selection needs to be a Yjs Relative Position that gets translated back to absolute position.
  // Commit: eba949d32d6010a3d8b3f7967d73d4deb015b02a has code that can help with this.
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AI_TOOLBAR_SELECTION_PLUGIN,
        props: {
          decorations: ({ doc }) => {
            const active = this.storage.selection !== undefined;
            if (!active) {
              return DecorationSet.create(doc, []);
            }
            const { from, to } = this.storage.selection as TextSelection;
            const decorations: Decoration[] = [
              Decoration.inline(from, to, {
                class: "lb-root lb-selection lb-tiptap-ai-selection",
              }),
            ];
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
