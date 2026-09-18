import * as React from "react";

import { browser } from "./react-dom";

const reactExports: Record<string, unknown> = React;

// Keep bundlers from turning this into a named import, which React 18 lacks.
const reactUse = reactExports[" use ".trim().toString()];

export function useBrowser(): void {
  if (isFunction(reactUse) && isFunction(browser)) {
    // browser() returns an opaque React value, not a Promise for our use polyfill.
    reactUse(browser());
    return;
  }

  if (typeof window === "undefined") {
    throw new Error(
      "You cannot use the Suspense version of Liveblocks hooks server side. Make sure to only call them client side by using a ClientSideSuspense wrapper.\nFor tips, see https://liveblocks.io/docs/api-reference/liveblocks-react#ClientSideSuspense"
    );
  }
}

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}
