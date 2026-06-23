import type { CommentData, ThreadData } from "@liveblocks/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Comment } from "../components/Comment";
import { Composer } from "../components/Composer";
import { Thread } from "../components/Thread";
import { ThreadVisibilityContext } from "../shared";
import { fireEvent, render, screen } from "./_utils"; // Basically re-exports from @testing-library/react

const useHasPermissionAccessMock = vi.hoisted(() => vi.fn(() => true));

vi.mock("@liveblocks/react/_private", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@liveblocks/react/_private")>()),
  useHasPermissionAccess: useHasPermissionAccessMock,
}));

vi.mock("../shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared")>()),
  useCurrentUserId: () => "user",
}));

const comment: CommentData = {
  type: "comment",
  id: "cm_1",
  threadId: "th_1",
  roomId: "room",
  userId: "user",
  createdAt: new Date("2023-08-14T12:41:50.243Z"),
  reactions: [],
  attachments: [],
  metadata: {},
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
  metadata: {},
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
  metadata: {},
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
  visibility: "public",
};

beforeEach(() => {
  useHasPermissionAccessMock.mockClear();
});

describe("Thread", () => {
  test("should render", () => {
    const { container } = render(<Thread thread={thread} />);

    expect(container).not.toBeEmptyDOMElement();
  });

  test("should check public comments write access for public threads", () => {
    render(<Thread thread={thread} />);

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:public",
      "write"
    );
  });

  test("should check private comments write access for private threads", () => {
    render(<Thread thread={{ ...thread, visibility: "private" }} />);

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:private",
      "write"
    );
  });
});

describe("Comment", () => {
  test("should render", () => {
    const { container } = render(<Comment comment={comment} />);

    expect(container).not.toBeEmptyDOMElement();
  });

  test("should check comments write access for standalone comments", () => {
    render(<Comment comment={comment} />);

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments",
      "write"
    );
  });

  test("should check scoped comments write access for comments in a thread visibility context", () => {
    render(
      <ThreadVisibilityContext.Provider value="private">
        <Comment comment={comment} />
      </ThreadVisibilityContext.Provider>
    );

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:private",
      "write"
    );
  });

  test("should check scoped comments write access when editing a comment in a thread visibility context", () => {
    render(
      <ThreadVisibilityContext.Provider value="private">
        <Comment comment={comment} />
      </ThreadVisibilityContext.Provider>
    );

    fireEvent.pointerDown(screen.getByLabelText("More"));
    fireEvent.click(screen.getByText("Edit comment"));

    expect(useHasPermissionAccessMock).toHaveBeenLastCalledWith(
      "room",
      "comments:private",
      "write"
    );
  });
});

describe("Composer", () => {
  test("should render", () => {
    const { container } = render(<Composer />);

    expect(container).not.toBeEmptyDOMElement();
  });

  test("should check public comments write access by default when creating a thread", () => {
    render(<Composer />);

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:public",
      "write"
    );
  });

  test("should check private comments write access when creating a private thread", () => {
    render(<Composer visibility="private" />);

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:private",
      "write"
    );
  });

  test("should check comments write access when replying to a thread directly", () => {
    render(<Composer threadId="th_1" />);

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments",
      "write"
    );
  });

  test("should use visibility context when replying to a thread", () => {
    render(
      <ThreadVisibilityContext.Provider value="private">
        <Composer threadId="th_1" />
      </ThreadVisibilityContext.Provider>
    );

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:private",
      "write"
    );
  });

  test("should ignore visibility context when creating a thread without a visibility prop", () => {
    render(
      <ThreadVisibilityContext.Provider value="private">
        <Composer />
      </ThreadVisibilityContext.Provider>
    );

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:public",
      "write"
    );
  });

  test("should use the explicit visibility prop when creating a thread in a visibility context", () => {
    render(
      <ThreadVisibilityContext.Provider value="private">
        <Composer visibility="public" />
      </ThreadVisibilityContext.Provider>
    );

    expect(useHasPermissionAccessMock).toHaveBeenCalledWith(
      "room",
      "comments:public",
      "write"
    );
  });
});
