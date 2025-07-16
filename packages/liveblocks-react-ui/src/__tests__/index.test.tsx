import "@testing-library/jest-dom";

import type {
  CommentData,
  RoomStateServerMsg,
  ThreadData,
} from "@liveblocks/core";
import { ServerMsgCode } from "@liveblocks/core";
import { rest } from "msw";
import { setupServer } from "msw/node";

import { Comment } from "../components/Comment";
import { Composer } from "../components/Composer";
import { Thread } from "../components/Thread";
import { Timestamp } from "../primitives";
import { Markdown } from "../primitives/Markdown";
import { dedent, render } from "./_utils"; // Basically re-exports from @testing-library/react

function remove<T>(array: T[], item: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

class MockWebSocket {
  readyState: number;
  static instances: MockWebSocket[] = [];

  isMock = true;

  callbacks = {
    open: [] as Array<(event?: WebSocketEventMap["open"]) => void>,
    close: [] as Array<(event?: WebSocketEventMap["close"]) => void>,
    error: [] as Array<(event?: WebSocketEventMap["error"]) => void>,
    message: [] as Array<(event?: WebSocketEventMap["message"]) => void>,
  };

  sentMessages: string[] = [];

  constructor(public url: string) {
    const actor = MockWebSocket.instances.push(this) - 1;
    this.readyState = 0 /* CONNECTING */;

    // Fake the server accepting the new connection
    setTimeout(() => {
      this.readyState = 1 /* OPEN */;
      for (const openCb of this.callbacks.open) {
        openCb();
      }

      // Send a ROOM_STATE message to the newly connected client
      for (const msgCb of this.callbacks.message) {
        const msg: RoomStateServerMsg<never> = {
          type: ServerMsgCode.ROOM_STATE,
          actor,
          nonce: `nonce-for-actor-${actor}`,
          scopes: ["room:write"],
          users: {},
        };
        msgCb({ data: JSON.stringify(msg) } as MessageEvent);
      }
    }, 0);
  }

  addEventListener(event: "open", callback: (event: Event) => void): void;
  addEventListener(event: "close", callback: (event: CloseEvent) => void): void;
  addEventListener(
    event: "message",
    callback: (event: MessageEvent) => void
  ): void;
  addEventListener(
    event: "open" | "close" | "message",
    callback:
      | ((event: Event) => void)
      | ((event: CloseEvent) => void)
      | ((event: MessageEvent) => void)
  ): void {
    this.callbacks[event].push(callback as any);
  }

  removeEventListener(event: "open", callback: (event: Event) => void): void;
  removeEventListener(
    event: "close",
    callback: (event: CloseEvent) => void
  ): void;
  removeEventListener(
    event: "message",
    callback: (event: MessageEvent) => void
  ): void;
  removeEventListener(
    event: "open" | "close" | "message",
    callback:
      | ((event: Event) => void)
      | ((event: CloseEvent) => void)
      | ((event: MessageEvent) => void)
  ): void {
    remove(this.callbacks[event], callback);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {
    this.readyState = 3 /* CLOSED */;
  }
}

window.WebSocket = MockWebSocket as any;

const server = setupServer(
  rest.post("/api/auth", (_, res, ctx) => {
    return res(
      ctx.json({
        token:
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzMzMjgsImV4cCI6MTY5MDAzMzMzMywiayI6InNlYy1sZWdhY3kiLCJyb29tSWQiOiJlTFB3dU9tTXVUWEN6Q0dSaTVucm4iLCJhcHBJZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsImFjdG9yIjoxLCJzY29wZXMiOlsicm9vbTp3cml0ZSJdLCJpZCI6InVzZXItMyIsIm1heENvbm5lY3Rpb25zUGVyUm9vbSI6MjB9.QoRc9dJJp-C1LzmQ-S_scHfFsAZ7dBcqep0bUZNyWxEWz_VeBHBBNdJpNs7b7RYRFDBi7RxkywKJlO-gNE8h3wkhebgLQVeSgI3YfTJo7J8Jzj38TzH85ZIbybaiGcxda_sYn3VohDtUHA1k67ns08Q2orJBNr30Gc88jJmc1He_7bLStsDP4M2F1NRMuFuqLULWHnPeEM7jMvLZYkbu3SBeCH4TQGyweu7qAXvP-HHtmvzOi8LdEnpxgxGjxefdu6m4a-fJj6LwoYCGi1rlLDHH9aOHFwYVrBBBVwoeIDSHoAonkPaae9AWM6igJhNt9-ihgEH6sF-qgFiPxHNXdg",
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  MockWebSocket.instances = [];
});
beforeEach(() => {
  MockWebSocket.instances = [];
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const comment: CommentData = {
  type: "comment",
  id: "cm_1",
  threadId: "th_1",
  roomId: "room",
  userId: "user",
  createdAt: new Date("2023-08-14T12:41:50.243Z"),
  reactions: [],
  attachments: [],
  body: {
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          {
            text: "hello ",
          },
          {
            text: "hello",
            italic: true,
          },
          {
            text: " ",
          },
          {
            text: "hello",
            bold: true,
          },
          {
            text: " ",
          },
          {
            text: "hello",
            code: true,
          },
          {
            text: " ",
          },
          {
            text: "hello",
            strikethrough: true,
          },
          {
            text: " ",
          },
          {
            type: "mention",
            kind: "user",
            id: "user-0",
          },
          {
            text: "",
          },
        ],
      },
    ],
  },
};

const editedComment: CommentData = {
  type: "comment",
  id: "cm_2",
  threadId: "th_1",
  roomId: "room",
  userId: "user",
  createdAt: new Date("2023-08-14T12:41:50.243Z"),
  editedAt: new Date("2023-08-14T12:41:50.243Z"),
  reactions: [],
  attachments: [],
  body: {
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          {
            text: "hello",
          },
        ],
      },
    ],
  },
};

const deletedComment: CommentData = {
  type: "comment",
  id: "cm_3",
  threadId: "th_1",
  roomId: "room",
  userId: "user",
  reactions: [],
  attachments: [],
  createdAt: new Date("2023-08-14T12:41:50.243Z"),
  editedAt: new Date("2023-08-14T12:41:50.243Z"),
  deletedAt: new Date("2023-08-14T12:41:50.243Z"),
};

const thread: ThreadData = {
  type: "thread",
  id: "th_1",
  roomId: "room",
  createdAt: new Date("2023-08-14T12:41:50.243Z"),
  updatedAt: new Date("2023-08-14T12:41:50.243Z"),
  comments: [comment, editedComment, deletedComment],
  metadata: {},
  resolved: false,
};

describe("Components", () => {
  describe("Thread", () => {
    test("should render", () => {
      const { container } = render(<Thread thread={thread} />);

      expect(container).not.toBeEmptyDOMElement();
    });
  });

  describe("Comment", () => {
    test("should render", () => {
      const { container } = render(<Comment comment={comment} />);

      expect(container).not.toBeEmptyDOMElement();
    });
  });

  describe("Composer", () => {
    test("should render", () => {
      const { container } = render(<Composer />);

      expect(container).not.toBeEmptyDOMElement();
    });
  });
});

describe("Primitives", () => {
  describe("Timestamp", () => {
    const now = Date.now();

    test("should render", () => {
      const { container } = render(<Timestamp date={now} />);

      expect(container).not.toBeEmptyDOMElement();
    });

    test.todo("should have a datetime attribute");

    test.todo("should rerender at an interval");

    test.todo("should support changing the rerender interval");

    test.todo("should support a title string");

    test.todo("should support a title function");

    test.todo("should support a children function");
  });

  describe("Markdown", () => {
    test.each([
      {
        description: "paragraphs",
        content: dedent`
          A paragraph.

          Another paragraph which
          spans multiple lines.
        `,
      },
      {
        description: "headings",
        content: dedent`
          # Heading 1

          ## Heading 2

          ### Heading 3

          #### Heading 4

          ##### Heading 5

          ###### Heading 6

          Alternate heading 1
          ===============

          Alternate heading 2
          --------------
        `,
      },
      {
        description: "bold text",
        content: dedent`
          **Bold** and __bold__.
        `,
      },
      {
        description: "italic text",
        content: dedent`
          *Italic* and _italic_.
        `,
      },
      {
        description: "strikethrough text",
        content: dedent`
          ~~Strikethrough~~.
        `,
      },
      {
        description: "inline code",
        content: dedent`
          Inline \`code\`.
        `,
      },
      {
        description: "links",
        content: dedent`
          A [link](https://www.liveblocks.io), [another one](/docs "With a title"),
          https://www.liveblocks.io, and <https://www.liveblocks.io>.
        `,
      },
      {
        description: "ordered lists",
        content: dedent`
          1. A list item
          2. Another list item
          3. Yet another list item
        `,
      },
      {
        description: "unordered lists",
        content: dedent`
          - A list item
          - Another list item
          - Yet another list item

          * A list item
          * Another list item
          * Yet another list item
          
          + A list item
          + Another list item
          + Yet another list item
        `,
      },
      {
        description: "task lists",
        content: dedent`
          - [ ] A list item
          - [x] Another list item
          - [ ] Yet another list item
        `,
      },
      {
        description: "mixed lists",
        content: dedent`
          - A list item
            1. A nested list item
            - Another nested list item
              - [ ] A deeply nested list item
          - Another list item
            1. A nested list item
            2. [x] Another nested list item
        `,
      },
      {
        description: "blockquotes",
        content: dedent`
          > A blockquote.

          > Another one which spans
          >
          > multiple paragraphs.

          > Yet another which
          >
          > > is nested.
        `,
      },
      {
        description: "code blocks",
        content: dedent`
          \`\`\`
          p {
            color: #000;
          }
          \`\`\`

          \`\`\`javascript
          const a = 2;
          \`\`\`
        `,
      },
      {
        description: "images",
        content: dedent`
          ![An image](https://www.liveblocks.io/favicon.png)
        `,
      },
      {
        description: "tables",
        content: dedent`
          | A column heading | Another column heading |
          |------------------|------------------------|
          | A cell           | Another cell           |
          | A cell           | Another cell           |
        `,
      },
      {
        description: "horizontal rules",
        content: dedent`
          ***

          ---

          _____
        `,
      },
      {
        description: "escaped characters",
        content: dedent`
          \*Not italic\* and \[not a link\]\(https://example.com\).
        `,
      },
      {
        description: "mixed content",
        content: dedent`
          A paragraph with **bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, **\`bold inline code\`**, and [links](https://liveblocks.io/).

          > A blockquote which includes \`code\`,
          > **bold**, and [links](https://liveblocks.io/) inside the blockquote.

          ### A heading

          - A list item
            - A nested list item

          ### Another heading

          1. A list item
          2. Another list item
            1. A nested list item with a [link](https://liveblocks.io/), **bold text**, and ~~strikethrough~~
            2. Another nested list item

          ---

          \`\`\`
          const x = 42;
          \`\`\`

          \`\`\`json
          { "name": "my-app", "version": "1.0.0" }
          \`\`\`

          - [x] ~~A completed task list item~~
          - [ ] A task list item with a [link](https://liveblocks.io/)
          - [x] A completed task list item with **bold text**

          ***

          | Feature       | Example                              | Notes                     |
          | ------------- | ------------------------------------ | ------------------------- |
          | Link          | [Liveblocks](https://liveblocks.io/) | External link             |
          | Inline code   | \`const x = 42;\`                    | Code inside table         |
          | Bold text     | **Important**                        | Styling test              |
          | Italic text   | _Emphasis_                           | Test italic inside tables |
          | Strikethrough | ~~Deprecated~~                       | Show removal              |

          > ### A quoted heading
          >
          > - A quoted unordered list item
          > - Another quoted unordered list item
          >
          > > A nested quote
          > >
          > > 1. A quoted ordered list item
          > > 2. Another quoted ordered list item
          >
          > \`\`\`ts
          > const x = 1;
          > \`\`\`
        `,
      },
    ] satisfies {
      description: string;
      content: string;
    }[])("should render $description", ({ content }) => {
      const result = render(
        <Markdown data-testid="markdown" content={content} />
      );

      console.log(result);
    });
  });
});
