export function captureStackTrace(
  msg: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  traceRoot?: Function
): string | undefined {
  // Hack: Normally browsers will add the name of the error before the stack trace (default Error).
  // To customize this, we set the name of the error to the message we want to display.
  const errorLike: { name: string; stack?: string } = { name: msg };

  // Error.captureStackTrace is non-standard and only available in certain browsers/runtimes.
  if (typeof Error.captureStackTrace !== "function") {
    return undefined;
  }

  Error.captureStackTrace(errorLike, traceRoot);
  return errorLike.stack;
}
