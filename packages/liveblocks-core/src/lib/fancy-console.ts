/* eslint-disable rulesdir/console-must-be-fancy */

const badge =
  "background:#0e0d12;border-radius:9999px;color:#fff;padding:3px 7px;font-family:sans-serif;font-weight:600;";
const bold = "font-weight:600";

function wrap(
  method: "log" | "warn" | "error"
): (message: string, ...args: readonly unknown[]) => void {
  return typeof window === "undefined" || process.env.NODE_ENV === "test"
    ? console[method]
    : /* istanbul ignore next */
      (message, ...args) =>
        console[method]("%cLiveblocks", badge, message, ...args);
}

// export const log = wrap("log");
export const warn = wrap("warn");
export const error = wrap("error");
export const log = console.log;

function wrapWithTitle(
  method: "log" | "warn" | "error"
): (title: string, message: string, ...args: readonly unknown[]) => void {
  return typeof window === "undefined" || process.env.NODE_ENV === "test"
    ? console[method]
    : /* istanbul ignore next */
      (title, message, ...args) =>
        console[method](
          `%cLiveblocks%c ${title}`,
          badge,
          bold,
          message,
          ...args
        );
}

// export const logWithTitle = wrapWithTitle("log");
export const warnWithTitle = wrapWithTitle("warn");
export const errorWithTitle = wrapWithTitle("error");
