import * as React from "react";

type Use = <T>(promise: Promise<T>) => T;

// Prevent bundlers from trying to `import { use } from "react";`
const reactUse = React[" use ".trim().toString() as keyof typeof React] as
  | Use
  | undefined;

/**
 * Drop-in replacement for React 19's `use` hook,
 * with a partial polyfill for older versions of React.
 *
 * ⚠️ Only supports `use(promise)`, not `use(context)`.
 */
export const use =
  reactUse ??
  (<T>(
    promise: Promise<T> & {
      status?: "pending" | "fulfilled" | "rejected";
      value?: T;
      reason?: unknown;
    }
  ): T => {
    if (promise.status === "pending") {
      throw promise;
    } else if (promise.status === "fulfilled") {
      return promise.value as T;
    } else if (promise.status === "rejected") {
      throw promise.reason;
    } else {
      promise.status = "pending";
      promise.then(
        (v) => {
          promise.status = "fulfilled";
          promise.value = v;
        },
        (e) => {
          promise.status = "rejected";
          promise.reason = e;
        }
      );
      throw promise;
    }
  });
