import { describe, expect, test, vi } from "vitest";

import type { ErrorContext } from "~/ErrorHandler.js";
import { ErrorHandler } from "~/ErrorHandler.js";
import { HttpError } from "~/index.js";

import {
  captureConsole,
  disableConsole,
  expectResponse,
  fail,
} from "./utils.js";

class CustomHttpError extends HttpError {
  constructor() {
    super(432, "Custom Error");
  }
}

class RandomError extends Error {
  x = 42;
}

// A stub to use in tests that want to handle an error, but aren't interested
// in testing error context details
const unused = Symbol() as any as ErrorContext<unknown>;

describe("ErrorHandler", () => {
  test("can only define a handler once", () => {
    const eh = new ErrorHandler();

    // First call works
    eh.onError(fail);

    // Second one fails
    expect(() => eh.onError(fail)).toThrow(
      "An error handler was already registered"
    );
  });

  test("can only define an uncaught handler once", () => {
    const eh = new ErrorHandler();

    // First call works
    eh.onUncaughtError(fail);

    // Second one fails
    expect(() => eh.onUncaughtError(fail)).toThrow(
      "An uncaught error handler was already registered"
    );
  });

  test("invokes default error handlers when no error handlers are provided", async () => {
    disableConsole();

    // Setup
    const eh = new ErrorHandler();

    const errA = new Error("Test1");
    const errB = new RandomError("Test2");
    const errC = new CustomHttpError();

    // Test
    await expectResponse(
      await eh.handle(errA, unused),
      { error: "Internal Server Error" },
      500
    );

    await expectResponse(
      await eh.handle(errB, unused),
      { error: "Internal Server Error" },
      500
    );

    await expectResponse(
      await eh.handle(errC, unused),
      { error: "Custom Error" },
      432
    );
  });

  test("invokes the correct error handler", async () => {
    // Setup
    const m1 = vi.fn(
      (e: HttpError) => new Response("normal error", { status: e.status })
    );
    const m2 = vi.fn(() => new Response("uncaught error", { status: 500 }));

    const eh = new ErrorHandler();
    eh.onError(m1);
    eh.onUncaughtError(m2);

    const errA = new Error("Test1");
    const errB = new RandomError("Test1");
    const errC = new CustomHttpError();

    // Test with errA
    await expectResponse(await eh.handle(errA, unused), "uncaught error", 500);
    expect(m1).not.toBeCalled();
    expect(m2).toBeCalledWith(errA, unused);
    m1.mockClear();
    m2.mockClear();

    // Test with errB
    await expectResponse(await eh.handle(errB, unused), "uncaught error", 500);
    expect(m1).not.toBeCalled();
    expect(m2).toBeCalledWith(errB, unused);
    m1.mockClear();
    m2.mockClear();

    // Test with errB
    await expectResponse(await eh.handle(errC, unused), "normal error", 432);
    expect(m1).toBeCalledWith(errC, unused);
    expect(m2).not.toBeCalled();
    m1.mockClear();
    m2.mockClear();
  });

  test("handling non-errors will use fallback", async () => {
    const konsole = captureConsole();

    const eh = new ErrorHandler();
    const notAnError = new Date();

    await expectResponse(
      await eh.handle(notAnError, unused),
      { error: "Internal Server Error" },
      500
    );

    expect(konsole.error).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^Uncaught error: .*/)
    );
    expect(konsole.error).toHaveBeenNthCalledWith(
      2,
      "...but no uncaught error handler was set up for this router."
    );
  });

  test("handles bugs in error handler itself", async () => {
    const konsole = captureConsole();

    const eh = new ErrorHandler();
    eh.onError(() => {
      throw new Error("Oops, I'm a broken error handler");
    });

    // Trigger a 404, but the broken error handler will not handle that correctly
    const res = await eh.handle(new HttpError(404), unused);
    await expectResponse(res, { error: "Internal Server Error" }, 500);

    expect(konsole.error).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(
        /^Uncaught error: Error: Oops, I'm a broken error handler/
      )
    );
  });
});
