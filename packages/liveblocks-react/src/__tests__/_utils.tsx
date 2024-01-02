import {
  BaseMetadata,
  LiveList,
  LiveObject,
  createClient,
} from "@liveblocks/client";
import type { RenderHookResult, RenderOptions } from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import * as React from "react";

import type {
  CacheManager,
  MutationInfo,
  RequestInfo,
} from "../comments/lib/revalidation";
import { RoomProvider } from "./_liveblocks.config";
import MockWebSocket from "./_MockWebSocket";
import { createRoomContext } from "../room";

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
    wrapper?: React.JSXElementConstructor<{ children: React.ReactElement }>;
  }
): RenderHookResult<Result, Props> {
  return renderHook(render, { wrapper: AllTheProviders, ...options });
}

export function createRoomContextForTest<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return createRoomContext<{}, never, never, never, TThreadMetadata>(client);
}

export function createCacheManager<Data>(
  initialCache?: Data | undefined
): CacheManager<Data> {
  let cache: Data | undefined = initialCache; // Stores the current cache state
  let request: RequestInfo<Data> | undefined; // Stores the currently active revalidation request
  let error: Error | undefined; // Stores any error that occurred during the last revalidation request
  let mutation: MutationInfo | undefined; // Stores the start and end time of the currently active mutation

  return {
    // Cache
    getCache() {
      return cache;
    },
    setCache(value: Data) {
      cache = value;
    },

    // Request
    getRequest() {
      return request;
    },
    setRequest(value: RequestInfo<Data> | undefined) {
      request = value;
    },

    // Error
    getError() {
      return error;
    },
    setError(err: Error) {
      error = err;
    },

    // Mutation
    getMutation() {
      return mutation;
    },
    setMutation(info: MutationInfo) {
      mutation = info;
    },
  };
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
