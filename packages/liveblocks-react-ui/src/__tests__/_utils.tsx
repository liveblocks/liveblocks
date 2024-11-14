import type {
  BaseMetadata,
  ClientOptions,
  CommentData,
  JsonObject,
  ThreadData,
} from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";
import type { RenderHookResult, RenderOptions } from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import * as React from "react";

import { RoomProvider, store } from "./_liveblocks.config";

export const comment: CommentData = {
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

export const thread: ThreadData = {
  type: "thread",
  id: "th_1",
  roomId: "room",
  createdAt: new Date("2023-08-14T12:41:50.243Z"),
  updatedAt: new Date("2023-08-14T12:41:50.243Z"),
  comments: [comment, editedComment, deletedComment],
  metadata: {},
  resolved: false,
};

/**
 * Testing context for all tests. Sets up a default RoomProvider to wrap all
 * tests with.
 */
export function AllTheProviders(props: { children: React.ReactNode }) {
  store.updateThreadAndNotification(thread);
  return (
    <RoomProvider id="room" initialPresence={() => ({})}>
      {props.children}
    </RoomProvider>
  );
}

/**
 * Wrapper for rendering components that are wrapped in a pre set up
 * <RoomProvider> context.
 */
function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Wrapper for rendering hooks that are wrapped in a pre set up
 * <RoomProvider> context.
 */
function customRenderHook<Result, Props>(
  render: (initialProps: Props) => Result,
  options?: {
    initialProps?: Props;
    wrapper?: React.JSXElementConstructor<{ children: React.ReactElement }>;
  }
): RenderHookResult<Result, Props> {
  return renderHook(render, { wrapper: AllTheProviders, ...options });
}

export function generateFakeJwt(options: { userId: string }) {
  // I tried to generate tokens with jose lib, but couldn't because of jest
  return Promise.resolve(
    `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(
      JSON.stringify({
        k: "acc",
        pid: "test_pid",
        uid: options.userId,
        perms: { "*": ["room:write"] },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000 + 3600),
      })
    )}.${btoa("fake_signature")}`
  );
}

export function createContextsForTest<M extends BaseMetadata>(
  {
    userId,
    ...options
  }: Omit<ClientOptions, "authEndpoint" | "publicApiKey"> & {
    userId?: string;
  } = { userId: "userId" }
) {
  const clientOptions: ClientOptions = options as ClientOptions;

  if (userId) {
    clientOptions.authEndpoint = async () => {
      const token = await generateFakeJwt({ userId });
      return {
        token,
      };
    };
  } else {
    clientOptions.publicApiKey = "pk_xxx";
  }

  const client = createClient(clientOptions);

  return {
    room: createRoomContext<JsonObject, never, never, never, M>(client),
    liveblocks: createLiveblocksContext(client),
    client,
  };
}

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
