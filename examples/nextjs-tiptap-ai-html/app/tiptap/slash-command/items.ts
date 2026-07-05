import { Editor } from "@tiptap/react";
import { Range } from "@tiptap/core";

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
    icon: "</>",
    keywords: ["ai", "html", "component", "interactive"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([{ type: "htmlComponent" }, { type: "paragraph" }])
        .run();
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
