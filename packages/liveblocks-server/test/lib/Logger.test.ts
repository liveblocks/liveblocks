/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { JsonObject } from "@liveblocks/core";

import type { LogLevel } from "~/lib/Logger";
import { Logger, LogTarget } from "~/lib/Logger";

class MockTarget extends LogTarget {
  public readonly output: string[] = [];

  log(lvl: LogLevel, ctx: JsonObject, arg: string | Error) {
    this.output.push(
      `[${this.formatLevel(lvl)}] ${this.formatArg(arg)} <${this.formatContext(ctx)}>`
    );
  }
}

describe("Logger", () => {
  describe("emission", () => {
    test("debug level", () => {
      const target = new MockTarget("debug");
      const logger = new Logger(target);
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warning message");
      logger.error("error message");

      expect(target.output).toEqual([
        "[debug] debug message <>",
        "[info] info message <>",
        "[warn] warning message <>",
        "[error] error message <>",
      ]);
    });

    test("info level", () => {
      const target = new MockTarget("info");
      const logger = new Logger(target);
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warning message");
      logger.error("error message");

      expect(target.output).toEqual([
        "[info] info message <>",
        "[warn] warning message <>",
        "[error] error message <>",
      ]);
    });

    test("warning level", () => {
      const target = new MockTarget("warning");
      const logger = new Logger(target);
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warning message");
      logger.error("error message");

      expect(target.output).toEqual([
        "[warn] warning message <>",
        "[error] error message <>",
      ]);
    });

    test("error level", () => {
      const target = new MockTarget("error");
      const logger = new Logger(target);
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warning message");
      logger.error("error message");

      expect(target.output).toEqual(["[error] error message <>"]);
    });
  });

  describe("context", () => {
    test("basic", () => {
      const target = new MockTarget("info");
      const logger = new Logger(target, { abc: 123 });
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warning message");
      logger.error("error message");

      expect(target.output).toEqual([
        "[info] info message <[abc=123]>",
        "[warn] warning message <[abc=123]>",
        "[error] error message <[abc=123]>",
      ]);
    });

    test("with added context", () => {
      const target = new MockTarget("warning");
      const logger1 = new Logger(target, { abc: 123 });
      const logger2 = logger1.withContext({ foo: "bar" });
      const logger3 = logger2.withContext({ abc: undefined });

      // Random order
      logger1.debug("debug message");
      logger2.debug("debug message");
      logger2.error("error message");
      logger1.info("info message");
      logger3.debug("debug message");
      logger3.info("info message");
      logger3.warn("warning message");
      logger3.error("error message");
      logger1.warn("warning message");
      logger2.warn("warning message");
      logger1.error("error message");
      logger2.info("info message");

      expect(target.output).toEqual([
        "[error] error message <[abc=123 foo=bar]>",
        "[warn] warning message <[foo=bar]>",
        "[error] error message <[foo=bar]>",
        "[warn] warning message <[abc=123]>",
        "[warn] warning message <[abc=123 foo=bar]>",
        "[error] error message <[abc=123]>",
      ]);
    });
  });

  describe("optional apis (.o)", () => {
    test("optional calls arguments are not evalutated", () => {
      const warningTarget = new MockTarget("warning");
      const errorTarget = new MockTarget("error");
      const logger = new Logger([warningTarget, errorTarget]);

      function fail(): never {
        throw new Error("This function should never get called");
      }

      // The point of the `o` (for "optional") APIs is to avoid evaluating the
      // expressions at runtime when this level would discard the message
      // anyway
      logger.o.debug?.(fail());
      logger.o.info?.(fail());
      logger.o.warn?.("cheap warning message");
      logger.o.error?.("cheap error message");

      expect(warningTarget.output).toEqual([
        "[warn] cheap warning message <>",
        "[error] cheap error message <>",
      ]);

      expect(errorTarget.output).toEqual(["[error] cheap error message <>"]);
    });
  });

  describe("multiple log targets", () => {
    test("multi targets all get the logs", () => {
      const t1 = new MockTarget("warning");
      const t2 = new MockTarget("warning");
      const t3 = new MockTarget("warning");

      const logger = new Logger([t1, t2, t3]);
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warning message");
      logger.error("error message");

      expect(t1.output).toEqual([
        "[warn] warning message <>",
        "[error] error message <>",
      ]);

      expect(t2.output).toEqual([
        "[warn] warning message <>",
        "[error] error message <>",
      ]);

      expect(t3.output).toEqual([
        "[warn] warning message <>",
        "[error] error message <>",
      ]);
    });
  });

  describe("formatting errors", () => {
    test("with stack traces", () => {
      const t1 = new MockTarget("warning");

      const logger = new Logger([t1]);
      logger.error(new Error("henk"));

      expect(t1.output).toEqual([
        expect.stringMatching(
          /^\[error\] Error: henk.*at .*Logger\.test\.ts.*<>$/s
          //          ^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^  ^^
          //          The message  The stack              ctx
        ),
      ]);
    });

    test("without stack traces", () => {
      const t1 = new MockTarget("warning");

      const logger = new Logger([t1]);
      const err = new Error("henk");
      delete err.stack;
      logger.error(err);

      expect(t1.output).toEqual(["[error] Error: henk <>"]);
    });

    test("won't print stack trace parts that overlaps with the error itself", () => {
      const t1 = new MockTarget("warning");

      const logger = new Logger([t1]).withContext({ abc: 123 });
      const err1 = new Error("foo");
      err1.stack = "Error: foo\n  i am a stack trace\n\n";

      const err2 = new Error("bar");
      err2.stack = "  i am also a stack trace\n\n";

      logger.error(err1);
      logger.error(err2);

      expect(t1.output).toEqual([
        "[error] Error: foo\n  i am a stack trace <[abc=123]>",
        "[error] Error: bar\n  i am also a stack trace <[abc=123]>",
      ]);
    });
  });
});
