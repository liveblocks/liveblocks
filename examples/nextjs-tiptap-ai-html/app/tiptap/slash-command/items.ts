import { Editor } from "@tiptap/react";
import { Range } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export type SlashCommandItem = {
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  command: (props: { editor: Editor; range: Range }) => void;
};

const ITEMS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    keywords: ["title", "heading", "h1"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    keywords: ["subtitle", "heading", "h2"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Code block",
    description: "Add formatted code",
    icon: "</>",
    keywords: ["code", "pre"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quotation",
    icon: '"',
    keywords: ["blockquote", "quote"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "HTML component",
    description: "Generate an interactive HTML box with AI",
    icon: "AI",
    keywords: ["ai", "html", "component", "interactive"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "htmlComponent" })
        .run();

      // `insertContent` may shift the insert position (e.g. when replacing an
      // empty paragraph), so locate the inserted node instead of assuming
      // `range.from`, then select it to focus its prompt input locally.
      const { doc, selection } = editor.state;

      if (
        selection instanceof NodeSelection &&
        selection.node.type.name === "htmlComponent"
      ) {
        return;
      }

      // The node sits directly before the resulting cursor position (atom
      // nodes have a size of 1), so prefer that exact spot; if the paragraph
      // was split instead, the node is one position further back.
      for (const pos of [selection.from - 1, selection.from - 2]) {
        if (pos < 0) {
          continue;
        }

        const node = doc.nodeAt(pos);

        if (node?.type.name === "htmlComponent") {
          editor.commands.setNodeSelection(pos);
          return;
        }
      }
    },
  },
];

export function getSlashCommandItems(query: string) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return ITEMS;
  }

  return ITEMS.filter((item) => {
    const searchableText = [
      item.title,
      item.description,
      ...item.keywords,
    ].join(" ");

    return searchableText.toLowerCase().includes(normalizedQuery);
  });
}
