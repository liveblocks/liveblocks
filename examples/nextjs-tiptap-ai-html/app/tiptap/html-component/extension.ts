import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { HtmlComponentView } from "./view";

/**
 * A block node representing one AI-generated HTML component.
 *
 * The node itself only stores an identifier: `feedId` points to the
 * Liveblocks feed holding every generated/edited version of the
 * component. The actual HTML lives in the feed messages, synced in
 * realtime, and the newest message is the displayed version.
 */
export const HtmlComponent = Node.create({
  name: "htmlComponent",

  group: "block",

  atom: true,

  selectable: true,

  addAttributes() {
    return {
      feedId: {
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
