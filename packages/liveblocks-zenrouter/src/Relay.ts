/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { abort, HttpError } from "~/responses/index.js";
import { ZenRouter } from "~/Router.js";

import { lookupContext } from "./contexts.js";
import { ErrorHandler } from "./ErrorHandler.js";
import type { PathPrefix } from "./lib/matchers.js";
import { makePrefixPathMatcher } from "./lib/matchers.js";

type RequestHandler = (
  req: Request,
  ...args: readonly any[]
) => Promise<Response>;

type RelayOptions = {
  errorHandler?: ErrorHandler;
};

/**
 * Relay won't do any route handling itself. It will only hand-off any incoming
 * request to one of the configured routers, based on the incoming request path
 * (first matching prefix path wins).
 *
 * It does NOT check the HTTP verb (GET, POST, etc).
 * It does NOT do any authentication.
 * It does NOT look at any headers.
 *
 * Subrouters (typically Router instances) are responsible for all that
 * themselves.
 *
 * If no matching route is found, it will return a generic 404 error response.
 */
export class ZenRelay {
  #_errorHandler: ErrorHandler;
  #_routers: [prefixMatcher: RegExp, handler: RequestHandler][] = [];

  constructor(options?: RelayOptions) {
    this.#_errorHandler = options?.errorHandler ?? new ErrorHandler();
  }

  public get fetch(): (
    req: Request,
    ...rest: readonly any[]
  ) => Promise<Response> {
    return this.#_tryDispatch.bind(this);
  }

  /**
   * If an incoming request matches the given prefix, forward the request as-is
   * to the child router. Relaying happens strictly based on the request URL.
   * It does not look at headers, or the HTTP method, or anything else to
   * decide if it's a match.
   */
  public relay(
    prefix: PathPrefix,
    router:
      | ZenRouter<any, any, any>
      //
      // NOTE: "RequestHandler" here is only allowed here to allow passing an
      // IttyRouter.handle instance here directly. Itty router is not built with
      // the same concepts as Zen Router in mind (for example, it can return
      // `undefined` instead of a Response to trigger a fallthrough). Overall,
      // it's better to remove this again once we're done refactoring away all
      // instances of Itty router.
      | RequestHandler
  ): this {
    const prefixMatcher = makePrefixPathMatcher(prefix);
    this.#_routers.push([
      prefixMatcher,
      router instanceof ZenRouter ? router.fetch : router,
    ]);
    return this; // Allow chaining
  }

  async #_tryDispatch(
    req: Request,
    ...args: readonly any[]
  ): Promise<Response> {
    try {
      return await this.#_dispatch(req, ...args);
    } catch (err) {
      if (!(err instanceof HttpError || err instanceof Response)) {
        // This case is definitely unexpected, it should never happen when
        // you're using only Relay or Router instances. However, it *can*
        // happen if the handler is a custom function (e.g. you're deferring to
        // itty-router), then this is not guaranteed.
        console.error(`Relayer caught error in subrouter! This should never happen, as routers should never throw an unexpected error! ${String(err)}`); // prettier-ignore
      }
      return this.#_errorHandler.handle(err, {
        req,
        ctx: lookupContext(req),
      });
    }
  }

  #_dispatch(req: Request, ...args: readonly any[]): Promise<Response> {
    const path = new URL(req.url).pathname;
    for (const [matcher, handler] of this.#_routers) {
      if (matcher.test(path)) {
        return handler(req, ...args);
      }
    }

    // console.warn(`Relayer did not know how to handle requested path: ${path}`);
    return abort(404);
  }
}
