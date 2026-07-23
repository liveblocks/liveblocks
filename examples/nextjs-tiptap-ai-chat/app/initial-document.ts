import type { ProseMirrorJsonNode } from "@liveblocks/prosemirror";

// The name used to store the editor's document under `root._tiptap_docs` in
// Liveblocks Storage. The editor and the AI route must use the same field.
export const DOCUMENT_FIELD = "document";

// Shown on the very first visit, before anyone (or the AI) has edited the
// document.
export const INITIAL_DOCUMENT: ProseMirrorJsonNode = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Product launch plan" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This document is shared with everyone in the room. Edit it directly, or ask the AI in the chat to rewrite, summarize, or extend it — its edits merge live with yours.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Goals" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Ship the beta to 100 design partners" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Collect feedback within two weeks" },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Timeline" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Kick-off next Monday, feature freeze at the end of the month, launch the week after.",
        },
      ],
    },
  ],
};
