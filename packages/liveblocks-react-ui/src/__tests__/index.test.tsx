import "@testing-library/jest-dom";

import type {
  CommentData,
  RoomStateServerMsg,
  ThreadData,
} from "@liveblocks/core";
import { ServerMsgCode } from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { Comment } from "../components/Comment";
import { Composer } from "../components/Composer";
import { Thread } from "../components/Thread";
import { render } from "./_utils"; // Basically re-exports from @testing-library/react

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
  http.post("/api/auth", () => {
    return HttpResponse.json({
      token:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzMzMjgsImV4cCI6MTY5MDAzMzMzMywiayI6InNlYy1sZWdhY3kiLCJyb29tSWQiOiJlTFB3dU9tTXVUWEN6Q0dSaTVucm4iLCJhcHBJZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsImFjdG9yIjoxLCJzY29wZXMiOlsicm9vbTp3cml0ZSJdLCJpZCI6InVzZXItMyIsIm1heENvbm5lY3Rpb25zUGVyUm9vbSI6MjB9.QoRc9dJJp-C1LzmQ-S_scHfFsAZ7dBcqep0bUZNyWxEWz_VeBHBBNdJpNs7b7RYRFDBi7RxkywKJlO-gNE8h3wkhebgLQVeSgI3YfTJo7J8Jzj38TzH85ZIbybaiGcxda_sYn3VohDtUHA1k67ns08Q2orJBNr30Gc88jJmc1He_7bLStsDP4M2F1NRMuFuqLULWHnPeEM7jMvLZYkbu3SBeCH4TQGyweu7qAXvP-HHtmvzOi8LdEnpxgxGjxefdu6m4a-fJj6LwoYCGi1rlLDHH9aOHFwYVrBBBVwoeIDSHoAonkPaae9AWM6igJhNt9-ihgEH6sF-qgFiPxHNXdg",
    });
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
