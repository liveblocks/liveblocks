import ReactDOM from "react-dom";

// Prevent bundlers from importing `flushSync` directly
// See https://github.com/radix-ui/primitives/pull/1028
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const useReactFlushSync: typeof ReactDOM.flushSync = (ReactDOM as any)[
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  "flushSync".toString()
];

function flushSyncFallback<R>(fn: () => R) {
  return fn();
}

// React's `flushSync` is only available in React >=17.
export const flushSync: typeof ReactDOM.flushSync =
  useReactFlushSync ?? flushSyncFallback;
