import { Mark, mergeAttributes } from "@tiptap/core";

export const LIVEBLOCKS_COMMENT_MARK_TYPE = "liveblocksCommentMark";

export const CommentExtension = Mark.create({
  name: LIVEBLOCKS_COMMENT_MARK_TYPE,
  excludes: "",
  inclusive: false,
  keepOnSplit: true,
  addAttributes() {
    // Return an object with attribute configuration
    return {
      orphan: {
        parseHTML: (element) => !!element.getAttribute("data-orphan"),
        renderHTML: (attributes) => {
          return (attributes as { orphan: boolean }).orphan
            ? {
                "data-orphan": "true",
              }
            : {};
        },
        default: false,
      },
      threadId: {
        parseHTML: (element) => element.getAttribute("data-lb-thread-id"),
        renderHTML: (attributes) => {
          return {
            "data-lb-thread-id": (attributes as { threadId: string }).threadId,
          };
        },
        default: "",
      },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "lb-root lb-tiptap-thread-mark",
      }),
    ];
  },
});
