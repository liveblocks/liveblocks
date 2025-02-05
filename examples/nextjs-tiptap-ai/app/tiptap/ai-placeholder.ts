import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { AI_NAME } from "./constants";

function isEmptyTextNode(node: Node) {
  return node.isTextblock && node.childCount === 0;
}

// This extension displays a placeholder in empty paragraphs
// and opens the AI toolbar when pressing space.
export const AiPlaceholder = Extension.create({
  name: "ai-placeholder",
  addOptions() {
    return {
      placeholder: `Press space to ask ${AI_NAME}…`,
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            if (!state.selection.empty) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (isEmptyTextNode(node)) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "placeholder",
                    "data-placeholder": this.options.placeholder,
                  })
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
          handleKeyDown: (view, event) => {
            if (event.key === " ") {
              if (isEmptyTextNode(view.state.selection.$head.node())) {
                event.preventDefault();

                // Open the AI toolbar
                return this.editor.commands.askAi();
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
