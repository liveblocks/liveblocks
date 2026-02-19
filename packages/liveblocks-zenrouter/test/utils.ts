import type { Json } from "@liveblocks/core";
import { expect, onTestFinished, vi } from "vitest";

import { json } from "~/index.js";

export function fail(): never {
  throw new Error("I should not get invoked");
}

export function ok(message: string) {
  return () => json({ message }, 200);
}

export function expectEmptyResponse(
  resp: Response,
  expectedStatus = 204
): void {
  try {
    if (!(resp instanceof Response)) {
      throw new Error(`Expected a Response, but found: ${String(resp)}`);
    }
    expect(resp.status).toEqual(expectedStatus);
  } catch (err) {
    // Hack the stack for better error messages, see https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
    Error.captureStackTrace(err as Error, expectEmptyResponse);
    throw err;
  }
}

export async function expectResponse(
  resp: Response,
  expectedBody: Json,
  expectedStatus = 200
): Promise<void> {
  try {
    if (!(resp instanceof Response)) {
      throw new Error(`Expected a Response, but found: ${String(resp)}`);
    }

    const mimeType = resp.headers.get("Content-Type")?.split(";")[0];
    if (mimeType === "application/json") {
      const json = await resp.json();
      expect(json).toEqual(expectedBody);
      expect(resp.status).toEqual(expectedStatus);
    } else if (mimeType === "text/plain") {
      const text = (await resp.text()) as unknown;
      expect(text).toEqual(expectedBody);
      expect(resp.status).toEqual(expectedStatus);
    } else {
      throw new Error("Unexpected content type: " + mimeType);
    }
  } catch (err) {
    // Hack the stack for better error messages, see https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
    Error.captureStackTrace(err as Error, expectResponse);
    throw err;
  }
}

type Consolish = Pick<typeof console, "log" | "info" | "warn" | "error">;

/**
 * Installs a console spy for the duration of this test.
 */
export function captureConsole(): Consolish {
  /* eslint-disable @typescript-eslint/unbound-method */
  const log = vi.spyOn(console, "log").mockImplementation(() => void 0);
  onTestFinished(log.mockRestore);

  const info = vi.spyOn(console, "info").mockImplementation(() => void 0);
  onTestFinished(info.mockRestore);

  const warn = vi.spyOn(console, "warn").mockImplementation(() => void 0);
  onTestFinished(warn.mockRestore);

  const error = vi.spyOn(console, "error").mockImplementation(() => void 0);
  onTestFinished(error.mockRestore);
  /* eslint-enable @typescript-eslint/unbound-method */

  return { log, info, warn, error } as unknown as Consolish;
}

/**
 * Disables the console for the duration of this test. Similar to
 * `captureConsole()`, but its puropse is different: we're not interested in
 * any console output here.
 */
export function disableConsole() {
  captureConsole();
}
