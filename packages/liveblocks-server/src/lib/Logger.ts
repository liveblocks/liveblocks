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
import { raise } from "@liveblocks/core";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
}

function formatError(err: Error) {
  const prefix = `${err.name}: ${err.message}`;
  return (
    err.stack?.startsWith(prefix) ? err.stack : `${prefix}\n${err.stack ?? ""}`
  ).trimEnd();
}

/**
 * Inherit from this abstract log target to implement your own custom
 * LogTarget.
 */
export abstract class LogTarget {
  public readonly level: LogLevel;

  #cache = new WeakMap<JsonObject, string>();

  constructor(level: LogLevel | keyof typeof LogLevelNames = LogLevel.INFO) {
    this.level =
      typeof level === "number"
        ? level
        : (LogLevelNames[level] ?? LogLevel.INFO);
  }

  /** Helper for formatting a log level */
  protected formatLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "debug";
      case LogLevel.INFO:
        return "info";
      case LogLevel.WARNING:
        return "warn";
      case LogLevel.ERROR:
        return "error";
      default:
        return raise("Invalid log level");
    }
  }

  /** Helper for formatting an Arg */
  protected formatArg(arg: string | Error): string {
    return typeof arg === "object"
      ? arg instanceof Error
        ? formatError(arg)
        : JSON.stringify(arg)
      : String(arg); // Coerce to string in case TypeScript is bypassed
  }

  /**
   * Helper for formatting a Context. Override this in a subclass to change the
   * formatting.
   */
  protected formatContextImpl(context: JsonObject): string {
    const parts = [];
    for (const [k, v] of Object.entries(context ?? {})) {
      if (v !== undefined) {
        // Object, or null, or array
        const sv = typeof v === "object" ? JSON.stringify(v) : v;
        parts.push(`${k}=${sv}`);
      }
    }
    return parts.length > 0 ? `[${parts.join(" ")}]` : "";
  }

  /**
   * Helper for formatting a Context. Will only compute the string once for
   * every Context instance, and keep its computed string value cached for
   * performance.
   */
  protected formatContext(context: JsonObject): string {
    let formatted = this.#cache.get(context);
    if (formatted === undefined) {
      formatted = this.formatContextImpl(context);
      this.#cache.set(context, formatted);
    }
    return formatted;
  }

  /**
   * Implement this in a concrete subclass. The goal is to do whatever to log
   * the given log level, context, and log arg. You'll typically want to
   * utilize the pre-defined helper methods .formatContext() and .formatArg()
   * to implement this.
   */
  abstract log(level: LogLevel, context: JsonObject, arg: string | Error): void;
}

//
// Console log target ----------------------------------------------------------
//

const CONSOLE_METHOD = {
  [LogLevel.DEBUG]: "info",
  [LogLevel.INFO]: "info",
  [LogLevel.WARNING]: "warn",
  [LogLevel.ERROR]: "error",
} as const;

export class ConsoleTarget extends LogTarget {
  log(level: LogLevel, context: JsonObject, arg: string | Error): void {
    console[CONSOLE_METHOD[level]](
      this.formatArg(arg),
      this.formatContext(context)
    );
  }
}

//
// Logger implementation ------------------------------------------------------
//

// Friendly names to pass to the constructor
const LogLevelNames = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warning: LogLevel.WARNING,
  error: LogLevel.ERROR,
} as const;

type LogFn = (arg: string | Error) => void;

/**
 * Structured logger with configurable log targets.
 */
export class Logger {
  public readonly debug: LogFn;
  public readonly info: LogFn;
  public readonly warn: LogFn;
  public readonly error: LogFn;

  public readonly o: {
    readonly debug?: LogFn;
    readonly info?: LogFn;
    readonly warn?: LogFn;
    readonly error?: LogFn;
  };

  private readonly _context: JsonObject;
  private readonly _targets: readonly LogTarget[];

  constructor(
    target: LogTarget | readonly LogTarget[] = new ConsoleTarget(),
    context: JsonObject = {}
  ) {
    this._context = context;
    this._targets = Array.isArray(target) ? target : [target];

    const minLevel: number = Math.min(...this._targets.map((t) => t.level));

    const noop = () => {};
    const makeLogFn = (lvl: LogLevel) => (arg: string | Error) =>
      this._targets.forEach((target) => {
        if (target.level <= lvl) {
          target.log(lvl, this._context, arg);
        }
      });

    this.o = {
      /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
      debug: minLevel <= LogLevel.DEBUG ? makeLogFn(LogLevel.DEBUG) : undefined,
      info: minLevel <= LogLevel.INFO ? makeLogFn(LogLevel.INFO) : undefined,
      warn:
        minLevel <= LogLevel.WARNING ? makeLogFn(LogLevel.WARNING) : undefined,
      error: minLevel <= LogLevel.ERROR ? makeLogFn(LogLevel.ERROR) : undefined,
      /* eslint-enable @typescript-eslint/no-unsafe-enum-comparison */
    };

    this.debug = this.o.debug ?? noop;
    this.info = this.o.info ?? noop;
    this.warn = this.o.warn ?? noop;
    this.error = this.o.error ?? noop;
  }

  /**
   * Creates a new Logger instance with the given extra context applied. All
   * log calls made from that new Logger will carry all current _and_ the extra
   * context, with the extra context taking precedence. Assign an explicit
   * `undefined` value to a key to "remove" it from the context.
   */
  withContext(extra: JsonObject): Logger {
    const combined: JsonObject = { ...this._context, ...extra };
    return new Logger(this._targets, combined);
  }
}
