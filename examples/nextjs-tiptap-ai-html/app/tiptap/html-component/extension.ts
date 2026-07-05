import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { HtmlComponentView } from "./view";

export const HtmlComponent = Node.create({
  name: "htmlComponent",

  group: "block",

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      prompt: {
        default: "",
      },
      html: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-html-component]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-html-component": "",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HtmlComponentView);
  },
});
