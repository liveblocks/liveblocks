import { DefaultMap } from "@liveblocks/core";
import type { FunctionComponent } from "react";

type Entry<P> = {
  wrappedFn: FunctionComponent<P>;
  currentFn?: FunctionComponent<P>;
};

const stableRenderFnCache = new DefaultMap((toolCallId: string) =>
  makeNewEntry<unknown>(toolCallId)
);

function makeNewEntry<P>(toolCallId: string): Entry<P> {
  const wrappedFn: FunctionComponent<P> = (props: P) => {
    const currentFn = entry.currentFn;
    if (!currentFn) {
      console.warn(
        `No render function found for toolCallId: ${toolCallId}. This should not happen.`
      );
      return null;
    }
    return currentFn(props);
  };

  if (process.env.NODE_ENV !== "production") {
    // Set display name for debugging
    wrappedFn.displayName = `StableRenderFn(${toolCallId})`;
  }

  const entry: Entry<P> = {
    wrappedFn,
  };
  return entry;
}

export function getStableRenderFn<P>(
  toolCallId: string,
  currentRenderFn: FunctionComponent<P>
): FunctionComponent<P> {
  const entry = stableRenderFnCache.getOrCreate(toolCallId);
  entry.currentFn = currentRenderFn as FunctionComponent<unknown>;
  return entry.wrappedFn;
}
