import { Editor, Range } from "@tiptap/core";
import { ReactNode } from "react";

export type SlashCommandItem = {
  title: string;
  description: string;
  icon: ReactNode;
  group?: "Basic blocks" | "Create with AI";
  keywords: string[];
  command: (props: { editor: Editor; range: Range }) => void;
};

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: <HeadingIcon level="1" />,
    group: "Basic blocks",
    keywords: ["title", "h1"],
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
    icon: <HeadingIcon level="2" />,
    group: "Basic blocks",
    keywords: ["subtitle", "h2"],
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
    title: "Heading 3",
    description: "Small section heading",
    icon: <HeadingIcon level="3" />,
    group: "Basic blocks",
    keywords: ["subtitle", "h3"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Bulleted list",
    description: "Create a simple bulleted list",
    icon: <ListIcon />,
    group: "Basic blocks",
    keywords: ["unordered", "bullet", "list"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered list",
    description: "Create a list with numbering",
    icon: <NumberedListIcon />,
    group: "Basic blocks",
    keywords: ["ordered", "number", "list"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote or aside",
    icon: <QuoteIcon />,
    group: "Basic blocks",
    keywords: ["blockquote", "citation"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code block",
    description: "Add a block of code",
    icon: <CodeIcon />,
    group: "Basic blocks",
    keywords: ["pre", "code"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Separate sections with a line",
    icon: <DividerIcon />,
    group: "Basic blocks",
    keywords: ["horizontal", "rule", "line"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "HTML component",
    description: "Generate interactive HTML with AI",
    icon: <SparklesIcon />,
    group: "Create with AI",
    keywords: ["ai", "html", "component", "interactive", "widget"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertHtmlBlock().run();
    },
  },
];

export function filterItems(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return slashCommandItems;
  }

  return slashCommandItems.filter((item) => {
    const searchable = [item.title, item.description, ...item.keywords]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function HeadingIcon({ level }: { level: "1" | "2" | "3" }) {
  return (
    <IconBase>
      <path d="M4 6v12" />
      <path d="M14 6v12" />
      <path d="M4 12h10" />
      <path d="M18 18h2" />
      <path d="M19 18v-6l-1.5 1.5" />
      {level === "2" ? <path d="M18 12h2a1 1 0 010 2l-2 4h3" /> : null}
      {level === "3" ? (
        <>
          <path d="M18 12h3l-2 2" />
          <path d="M19 14h1a2 2 0 010 4h-2" />
        </>
      ) : null}
    </IconBase>
  );
}

function ListIcon() {
  return (
    <IconBase>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </IconBase>
  );
}

function NumberedListIcon() {
  return (
    <IconBase>
      <path d="M10 6h11" />
      <path d="M10 12h11" />
      <path d="M10 18h11" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M4 14h2a1 1 0 010 2l-2 2h3" />
    </IconBase>
  );
}

function QuoteIcon() {
  return (
    <IconBase>
      <path d="M3 21c3 0 6-3 6-6V7H3v8h4c0 2-2 4-4 4v2z" />
      <path d="M15 21c3 0 6-3 6-6V7h-6v8h4c0 2-2 4-4 4v2z" />
    </IconBase>
  );
}

function CodeIcon() {
  return (
    <IconBase>
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
    </IconBase>
  );
}

function DividerIcon() {
  return (
    <IconBase>
      <path d="M4 12h16" />
    </IconBase>
  );
}

function SparklesIcon() {
  return (
    <IconBase>
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </IconBase>
  );
}
