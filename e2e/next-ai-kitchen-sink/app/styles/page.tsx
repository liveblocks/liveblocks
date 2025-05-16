"use client";

import { Lexer } from "marked";
import {
  HTMLAttributes,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  BlockToken,
  BlockTokenComp as BlockTokenCompPrimitive,
} from "../chats/[chatId]/markdown";
import * as CollapsiblePrimitive from "../chats/[chatId]/collapsible";
import {
  ChevronDownIcon,
  ChevronRightIcon,
} from "@liveblocks/react-ui/_private";

function TextPart({
  text,
  ...props
}: HTMLAttributes<HTMLDivElement> & { text: string }) {
  const tokens = useMemo(() => {
    return new Lexer().lex(text);
  }, [text]);

  return (
    <div {...props}>
      {tokens.map((token, index) => {
        return (
          <MemoizedBlockTokenComp token={token as BlockToken} key={index} />
        );
      })}
    </div>
  );
}

function ReasoningPart({
  text,
  isPending,
}: {
  text: string;
  isPending: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsiblePrimitive.Root
      className="lb-ai-chat-message-collapsible lb-ai-chat-message-reasoning"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsiblePrimitive.Trigger
        className={`lb-ai-chat-message-collapsible-trigger ${
          isPending ? "lb-ai-chat-pending" : ""
        }`}
      >
        Reasoning
        <span className="lb-icon-container">
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
      </CollapsiblePrimitive.Trigger>

      <CollapsiblePrimitive.Content className="lb-ai-chat-message-collapsible-content">
        <TextPart className="lb-ai-chat-message-text" text={text} />
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

const MemoizedBlockTokenComp = memo(
  function BlockTokenComp({ token }: { token: BlockToken }) {
    return <BlockTokenCompPrimitive token={token} />;
  },
  (prevProps, nextProps) => {
    const prevToken = prevProps.token;
    const nextToken = nextProps.token;
    if (prevToken.raw.length !== nextToken.raw.length) {
      return false;
    }
    if (prevToken.type !== nextToken.type) {
      return false;
    }
    return prevToken.raw === nextToken.raw;
  }
);

const reasoningMessage = `
This is a reasoning message, it can also include **bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, **\`bold inline code\`**, and [links](https://liveblocks.io/).

It can also include multiple paragraphs, headings, blockquotes, lists, code blocks, and more.

> This is a blockquote.
> It can span multiple lines.
> It also includes \`code\`, **bold**, and links inside the blockquote.

### Unordered List

- A root item
  - A nested item

### Ordered List

1. A root item
2. An item with children
   1. A long nested item to see how it wraps, with a [link](https://liveblocks.io/), **bold text**, and ~~strikethrough~~
   2. A nested item

\`\`\`tsx
const x = 42;
\`\`\`

\`\`\`json
{ "name": "my-app", "version": "1.0.0" }
\`\`\`
`;

const simpleMarkdownMessage = `
This is a regular paragraph of text. It includes **bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, **\`bold inline code\`**, and [links](https://liveblocks.io/).

Here’s a second paragraph to test spacing between multiple paragraphs.

> This is a blockquote.
> It can span multiple lines.
> It also includes \`code\`, **bold**, and links inside the blockquote.
`;

const markdownMessage = `
# H1 Heading

## H2 Heading

### H3 Heading

#### H4 Heading

##### H5 Heading

###### H6 Heading

---

This is a regular paragraph of text. It includes **bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, **\`bold inline code\`**, and [links](https://liveblocks.io/).

Here’s a second paragraph to test spacing between multiple paragraphs.

> This is a blockquote.
> It can span multiple lines.
> It also includes \`code\`, **bold**, and links inside the blockquote.

---

### Unordered List

- A root item
  - A nested item
    - A long nested item to see how it wraps, with a [link](https://liveblocks.io/), **bold text**, and ~~strikethrough~~
  - Another nested item
- Another long nested item to see how it wraps, with a [link](https://liveblocks.io/), **bold text**, and ~~strikethrough~~

### Ordered List

1. A root item
2. An item with children
   1. A long nested item to see how it wraps, with a [link](https://liveblocks.io/), **bold text**, and ~~strikethrough~~
   2. A nested item
3. Another long nested item to see how it wraps, with a [link](https://liveblocks.io/), **bold text**, and ~~strikethrough~~

### Mixed Lists

- A unordered list item
  1. A nested ordered list item with a [link](https://liveblocks.io/), **bold text**, and ~~strikethrough~~s
  2. Another nested ordered list item
- A unordered list item with **bold text**

---

# H1 Heading with \`code\`

Some text directly under a heading.

## H2 Heading with \`code\`

Some text directly under a heading.

### H3 Heading with \`code\`

Some text directly under a heading.

#### H4 Heading with \`code\`

Some text directly under a heading.

##### H5 Heading with \`code\`

Some text directly under a heading.

###### H6 Heading with \`code\`

Some text directly under a heading.

---

# H1 Heading

\`\`\`tsx
import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
};

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers);
  }, []);

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
\`\`\`

- A list item
- A list item
- A list item

\`\`\`bash
# A multi-line shell script example
set -e

echo "Starting server..."
bun run dev

echo "Done!"
\`\`\`

## H2 Heading

\`\`\`json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "bun run dev",
    "build": "bun run build"
  },
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}
\`\`\`

> A blockquote

\`\`\`css
.prose {
  max-width: 65ch;
  line-height: 1.75;
  font-feature-settings: "liga" 1;
}
\`\`\`

### H3 Heading

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Example</title>
  </head>
  <body>
    <h1>Hello, world!</h1>
  </body>
</html>
\`\`\`

Some text between two code blocks.

\`\`\`css
.prose {
  max-width: 65ch;
  line-height: 1.75;
  font-feature-settings: "liga" 1;
}
\`\`\`

#### H4 Heading

\`\`\`json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "bun run dev",
    "build": "bun run build"
  },
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}
\`\`\`

##### H5 Heading

\`\`\`tsx
<div>
  <h1>Hello, world!</h1>
</div>
\`\`\`

###### H6 Heading

\`\`\`
A code block without any language
Just some plain text
\`\`\`

---

| Syntax    | Description |
| --------- | ----------- |
| Header    | Title       |
| Paragraph | Text        |

| Feature       | Example                              | Notes                     |
| ------------- | ------------------------------------ | ------------------------- |
| Link          | [Liveblocks](https://liveblocks.io/) | External link             |
| Inline code   | \`const x = 42;\`                    | Code inside table         |
| Bold text     | **Important**                        | Styling test              |
| Italic text   | _Emphasis_                           | Test italic inside tables |
| Strikethrough | ~~Deprecated~~                       | Show removal              |

---

> ### Quoted Heading
>
> - A quoted unordered list item
> - Another quoted unordered list item
>
> 1. A quoted ordered list item
> 2. Another quoted ordered list item
>
> \`\`\`ts
> const x = 1;
> \`\`\`

> Outer quote
>
> > Inner quote
> >
> > - With list
> > - And \`code\`

---

The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

This is <mark>highlighted</mark> text.

E = mc<sup>2</sup>
`;

const lineBreakMessage = `
A message in a single paragraph with line breaks

This is a new line

This is another line
`;

function useIsMounted() {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return isMounted;
}

function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Home() {
  const isMounted = useIsMounted();

  const [isReasoning, setReasoning] = useState(true);
  const [isStreaming, setStreaming] = useState(false);
  const [streamedMarkdownMessage, setStreamedMarkdownMessage] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset and clear interval when toggling
    setStreamedMarkdownMessage("");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isStreaming) {
      return;
    }

    let index = 0;

    intervalRef.current = setInterval(() => {
      index += random(4, 10);

      setStreamedMarkdownMessage(markdownMessage.slice(0, index));

      if (index >= markdownMessage.length && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 40);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isStreaming]);

  if (!isMounted) {
    return null;
  }

  return (
    <main style={{ height: "100vh", width: "100%" }}>
      <div className="lb-root lb-ai-chat">
        <div className="lb-ai-chat-content">
          <div className="lb-ai-chat-messages">
            <div className="lb-ai-chat-message lb-ai-chat-user-message">
              <div className="lb-ai-chat-message-content">
                <div className="lb-ai-chat-message-deleted">
                  This message has been deleted.
                </div>
              </div>
            </div>
            <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
              <div className="lb-ai-chat-message-deleted">
                This message has been deleted.
              </div>
            </div>

            <div className="lb-ai-chat-message lb-ai-chat-user-message">
              <div className="lb-ai-chat-message-content">
                <div className="lb-ai-chat-message-text">
                  <p>A pending message</p>
                </div>
              </div>
            </div>
            <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
              <div className="lb-ai-chat-message-thinking lb-ai-chat-pending">
                Thinking…
              </div>
            </div>
            <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
              <div className="lb-ai-chat-message-thinking lb-ai-chat-pending">
                Thinking but with a longer message to see how flexible the
                shimmer is…
              </div>
            </div>

            <div className="lb-ai-chat-message lb-ai-chat-user-message">
              <div className="lb-ai-chat-message-content">
                <div className="lb-ai-chat-message-text">
                  <p>A reasoning message with tools</p>
                </div>
              </div>
            </div>
            <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
              <div className="lb-ai-chat-message-content">
                <ReasoningPart
                  text={reasoningMessage}
                  isPending={isReasoning}
                />
                <TextPart
                  className="lb-ai-chat-message-text"
                  text={simpleMarkdownMessage}
                />
                <div className="lb-ai-chat-message-tool">
                  <div style={{ background: "rgba(255, 120, 120, 0.2)" }}>
                    A rendered tool
                  </div>
                </div>
                <div className="lb-ai-chat-message-tool">
                  <div style={{ background: "rgba(255, 120, 120, 0.2)" }}>
                    A second rendered tool immediately after the first one
                  </div>
                </div>
                <TextPart
                  className="lb-ai-chat-message-text"
                  text={simpleMarkdownMessage}
                />
                <div className="lb-ai-chat-message-tool">
                  <div style={{ background: "rgba(255, 120, 120, 0.2)" }}>
                    A rendered tool as the last part
                  </div>
                </div>
              </div>
            </div>

            <div className="lb-ai-chat-message lb-ai-chat-user-message">
              <div className="lb-ai-chat-message-content">
                <div className="lb-ai-chat-message-text">
                  <p>A Markdown message</p>
                </div>
              </div>
            </div>
            <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
              <div className="lb-ai-chat-message-content">
                <TextPart
                  className="lb-ai-chat-message-text"
                  text={isStreaming ? streamedMarkdownMessage : markdownMessage}
                />
              </div>
            </div>

            <div className="lb-ai-chat-message lb-ai-chat-user-message">
              <div className="lb-ai-chat-message-content">
                <div className="lb-ai-chat-message-text">
                  <p>A message with line breaks</p>
                </div>
              </div>
            </div>
            <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
              <div className="lb-ai-chat-message-content">
                <p>{lineBreakMessage}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="lb-ai-chat-footer">
          <div className="lb-ai-chat-composer">
            {/* Debug panel */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "1rem",
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={isReasoning}
                  onChange={(event) => setReasoning(event.target.checked)}
                />{" "}
                Currently reasoning
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={isStreaming}
                  onChange={(event) => setStreaming(event.target.checked)}
                />{" "}
                Simulate Markdown streaming
              </label>
              <label style={{ opacity: 0.5 }}>
                {/* TODO: Disable all styles for this page except the Liveblocks ones */}
                <input type="checkbox" disabled /> Disable Tailwind/reset styles
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
