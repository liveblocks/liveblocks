import { raise } from "~/lib/utils.js";
import {
  HttpError,
  isGenericAbort,
  json,
  ValidationError,
} from "~/responses/index.js";

export type ErrorContext<RC> = {
  req: Request;
  ctx?: RC;
};

export type ErrorHandlerFn<E, RC = unknown> = (
  error: E,
  extra: ErrorContext<RC>
) => Response | Promise<Response>;

// The default handler for HttpErrors, in case no custom handler is provided
const defaultHttpErrorHandler: ErrorHandlerFn<HttpError> = (e) =>
  json(
    {
      error: e.message,
      reason: e instanceof ValidationError ? e.reason : undefined,
    },
    e.status,
    e.headers
  );

// The default uncaught error handler, in case no custom handler is provided.
// It's the ultimate fallback if everything else has failed.
const defaultUncaughtErrorHandler: ErrorHandlerFn<unknown> = () =>
  json({ error: "Internal Server Error" }, 500);

/**
 * Central registry instance for handling HTTP errors. Has configured defaults
 * for every known HTTP error code. Allows you to override those defaults and
 * provide your own error handling preferences.
 */
export class ErrorHandler {
  // A registered error handler, if any error handlers, ordered from most-specific to
  // least-specific
  #_httpErrorHandler: ErrorHandlerFn<HttpError> | null = null;

  // A registered error handler to be called for any uncaught (non-HttpError)
  // errors. They will typically be Error instances, but it cannot be
  // guaranteed they are.
  #_uncaughtErrorHandler: ErrorHandlerFn<unknown> | null = null;

  /**
   * Registers a custom HTTP error handler.
   *
   * This will get called whenever an `HttpError` is thrown (which also happens
   * with `abort()`) from a route handler.
   *
   * It will *NOT* get called if a `Response` instance is thrown (or returned)
   * from a handler directly!
   */
  public onError(handler: ErrorHandlerFn<HttpError>): void {
    if (this.#_httpErrorHandler !== null) {
      raise("An error handler was already registered");
    }
    this.#_httpErrorHandler = handler;
  }

  /**
   * Registers a custom uncaught error handler.
   *
   * This will only get called if there is an unexpected error thrown from
   * a route handler, i.e. something that isn't a `Response` instance, or an
   * `HttpError`.
   */
  public onUncaughtError(handler: ErrorHandlerFn<unknown>): void {
    if (this.#_uncaughtErrorHandler !== null) {
      raise("An uncaught error handler was already registered");
    }
    this.#_uncaughtErrorHandler = handler;
  }

  /**
   * Given an error, will find the best (most-specific) error handler for it,
   * and return its response.
   */
  public async handle(
    err: unknown,
    extra: ErrorContext<unknown>
  ): Promise<Response> {
    // If it's a Response, check if it's a generic abort or a custom response
    if (err instanceof Response) {
      if (isGenericAbort(err)) {
        // Generic abort - convert to HttpError and run through normal error handling
        const status = err.status;
        const headers = Object.fromEntries(err.headers.entries());
        try {
          err = new HttpError(status, undefined, headers);
          // Fall through to HttpError handling below
        } catch {
          // Status code not supported by HttpError (5xx, 422, or unknown code)
          return json({ error: "Unknown" }, status, headers);
        }
      } else {
        // Custom response - return verbatim
        return err;
      }
    }

    // If error is not an instance of HttpError, then it's an otherwise
    // uncaught error that should lead to an 5xx response. We'll wrap it in an
    // UncaughtError instance, so the custom handler will only ever have to
    // deal with HttpErrors.
    if (err instanceof HttpError) {
      const httpErrorHandler =
        this.#_httpErrorHandler ?? defaultHttpErrorHandler;
      try {
        return await httpErrorHandler(err, extra);
      } catch (e) {
        // Fall through, let the uncaught error handler handle it
        err = e;
      }
    }

    // At this point, `err` can be anything
    if (this.#_uncaughtErrorHandler) {
      try {
        return await this.#_uncaughtErrorHandler(err, extra);
      } catch (e) {
        // Fall through
        // istanbul ignore next -- @preserve
        err = e;
      }
    } else {
      console.error(`Uncaught error: ${(err as Error)?.stack ?? String(err)}`); // prettier-ignore
      console.error("...but no uncaught error handler was set up for this router."); // prettier-ignore
    }

    // The default uncaught error handler cannot fail. It's the ultimate fallback.
    return defaultUncaughtErrorHandler(err, extra);
  }
}
