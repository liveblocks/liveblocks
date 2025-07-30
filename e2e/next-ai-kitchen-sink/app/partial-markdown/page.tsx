"use client";

import {
  HTMLAttributes,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Prose } from "@liveblocks/react-ui/_private";

function TextPart({
  text,
  partial,
  ...props
}: HTMLAttributes<HTMLDivElement> & { text: string; partial?: boolean }) {
  return (
    <Prose
      content={text}
      partial={partial}
      {...props}
      className="lb-ai-chat-message-text"
    />
  );
}

const markdownMessage = `
# The long and winding road that leads to your door will never disappear, I've seen that road before it always leads me here, lead me to your door

## Here we are, stuck by this river, you and I, underneath the sky that's ever falling down, down, down, ever falling down

### Like a heartbeat drives you mad, in the stillness of remembering, what you had and what you lost, and what you had and what you lost

#### Kim and Jessie, they have a secret world in the twilight, kids of the woods, they're crazy about romance and illusions

##### You spent the first five years trying to get with the plan, and the next five years trying to be with your friends again

###### Because in this city's barren cold, I still remember the first fall of snow, and how it glistened as it fell, I remember it all too well

---

This is a regular paragraph of text. It includes **bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, **\`bold inline code\`**, and [links](https://liveblocks.io/ "With a title").
Hello world the rest of the first paragraph is here.

Here’s a second paragraph to test spacing between multiple paragraphs.

> This is a blockquote.
> It can span multiple **lines.
> It** also includes \`code\`, **bold**, and links inside the blockquote.

> This is a blockquote.
>
> It also includes \`code\`, **bold**, and links inside the blockquote.

- A list item

- Another list item with

  multiple paragraphs.

  | Syntax    | Description |
  | --------- | ----------- |
  | Header    | Title       |
  | Paragraph | Text        |

  - A nested list item

- [x] A task list item with

  > a quote and a code block

  ### test

  \`\`\`
  const a = 2;
  \`\`\`

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

### Task List

- [ ] A task list item
- [x] A completed task list item
- [ ] A task list item with a [link](https://liveblocks.io/)
- [x] A completed task list item with **bold text**
- [ ] A task list item with ~~strikethrough~~

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

| Syntax *italic* and \`code\`    | Description |
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

1. A numbered list item
- A "nested" list item
- Another "nested" list item

2. Another numbered list item
- A "nested" list item
- Another "nested" list item

3. Yet another numbered list item
- A "nested" list item
- Another "nested" list item

---

1. A numbered list item

\`\`\`
const a = 2;
\`\`\`

2. Another numbered list item

> A quote.

3. Yet another numbered list item

A paragraph.

---

1. A numbered list item
1. Another numbered list item
1. Yet another numbered list item

---

The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

This is <mark>highlighted</mark> text.

E = mc<sup>2</sup>
`;

export default function Home() {
  const min = 0;
  const max = markdownMessage.length;
  const [value, setValue] = useState(min);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimeoutAndInterval = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (direction: "previous" | "next") => {
      const change = direction === "next" ? 1 : -1;

      clearTimeoutAndInterval();

      setValue((last) => Math.max(min, Math.min(max, last + change)));

      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          setValue((last) => Math.max(min, Math.min(max, last + change)));
        }, 75);
      }, 500);
    },
    [clearTimeoutAndInterval, min, max]
  );

  const handlePointerUp = useCallback(() => {
    clearTimeoutAndInterval();
  }, [clearTimeoutAndInterval]);

  useEffect(() => {
    return () => {
      clearTimeoutAndInterval();
    };
  }, [clearTimeoutAndInterval]);

  return (
    <main
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",

        // This give us a "stick to bottom" behavior for free
        flexDirection: "column-reverse",
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", flex: "1", paddingBottom: "6rem" }}>
        <div className="lb-root lb-ai-chat lb-ai-chat:layout-inset">
          <div className="lb-ai-chat-content">
            <div className="lb-ai-chat-messages">
              <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
                <div className="lb-ai-chat-message-content">
                  <TextPart
                    className="lb-ai-chat-message-text"
                    text={markdownMessage.slice(0, value)}
                    partial={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lb-root lb-ai-chat lb-ai-chat:layout-inset">
          <div className="lb-ai-chat-content">
            <div className="lb-ai-chat-messages">
              <div className="lb-ai-chat-message lb-ai-chat-assistant-message">
                <div className="lb-ai-chat-message-content">
                  <TextPart
                    className="lb-ai-chat-message-text"
                    text={markdownMessage.slice(0, value)}
                    partial={value < markdownMessage.length}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          padding: "2rem",
        }}
      >
        <div className="lb-ai-chat-footer">
          <div className="lb-root lb-ai-chat-composer lb-ai-chat-composer-form lb-elevation lb-elevation-moderate">
            {/* Debug panel */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                padding: "1rem",
              }}
            >
              <input
                type="range"
                min={min}
                max={max}
                value={value}
                step={1}
                onChange={(event) => setValue(Number(event.target.value))}
                style={{
                  flex: 1,
                }}
              />
              <button
                onPointerDown={() => handlePointerDown("previous")}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                  all: "revert",
                }}
              >
                Previous
              </button>
              <button
                onPointerDown={() => handlePointerDown("next")}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                  all: "revert",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
