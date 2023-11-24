import { LiveList, LiveObject } from "@liveblocks/client";
import type { RenderHookResult, RenderOptions } from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import * as React from "react";

import type { CacheManager } from "../comments/lib/revalidation";
import { RoomProvider } from "./_liveblocks.config";

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

export function createCacheManager<Data>(
  initialCache?: Data | undefined
): CacheManager<Data> {
  return {
    cache: initialCache ? { isLoading: false, data: initialCache } : undefined,
    request: undefined,
    mutation: undefined,
  };
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
