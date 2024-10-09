import type {
  BaseMetadata,
  ClientOptions,
  JsonObject,
} from "@liveblocks/client";
import { createClient, LiveList, LiveObject } from "@liveblocks/client";
import type { RenderHookResult, RenderOptions } from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import * as React from "react";

import {
  createLiveblocksContext,
  getLiveblocksExtrasForClient,
} from "../liveblocks";
import { createRoomContext } from "../room";
import { RoomProvider } from "./_liveblocks.config";
import MockWebSocket from "./_MockWebSocket";

/**
 * Testing context for all tests. Sets up a default RoomProvider to wrap all
 * tests with.
 */
export function AllTheProviders(props: { children: React.ReactNode }) {
  return (
    <RoomProvider
      id="room"
      initialPresence={() => ({ x: 1 })}
      initialStorage={() => ({
        obj: new LiveObject({
          a: 0,
          nested: new LiveList(["foo", "bar"]),
        }),
      })}
    >
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
    wrapper?: React.JSXElementConstructor<{ children: React.ReactNode }>;
  }
): RenderHookResult<Result, Props> {
  return renderHook(render, { wrapper: AllTheProviders, ...options });
}

export function createContextsForTest<M extends BaseMetadata>(
  {
    userId,
    ...options
  }: Omit<ClientOptions, "authEndpoint" | "publicApiKey"> & {
    userId?: string;
  } = { userId: "userId" }
) {
  const clientOptions: ClientOptions = {
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
    ...options,
  } as ClientOptions;

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
  const { store: umbrellaStore } = getLiveblocksExtrasForClient<M>(client);

  return {
    room: createRoomContext<JsonObject, never, never, never, M>(client),
    liveblocks: createLiveblocksContext(client),
    client,
    umbrellaStore,
  };
}

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };

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
