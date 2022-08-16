import { LiveObject } from "@liveblocks/client";
import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import * as React from "react";

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
      initialStorage={() => ({ obj: new LiveObject({ a: 0 }) })}
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

export * from "@testing-library/react";
export { customRender as render };
