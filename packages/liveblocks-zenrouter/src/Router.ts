/* eslint-disable @typescript-eslint/no-unsafe-argument */

// TODO: Make this a local definition?
import type { Json, JsonObject } from "@liveblocks/core";
import { context, trace } from "@opentelemetry/api";
import type { Decoder } from "decoders";
import { formatShort } from "decoders";

import type {
  ExtractParams,
  HttpVerb,
  MapDecoderTypes,
  Pattern,
  RouteMatcher,
} from "~/lib/matchers.js";
import { routeMatcher, sortHttpVerbsInPlace } from "~/lib/matchers.js";
import { mapv, raise } from "~/lib/utils.js";
import type { HttpError } from "~/responses/index.js";
import { abort, json, ValidationError } from "~/responses/index.js";

import { attachContext, lookupContext } from "./contexts.js";
import type { CorsOptions } from "./cors.js";
import { AC_ORIGIN, getCorsHeaders } from "./cors.js";
import type { ErrorHandlerFn } from "./ErrorHandler.js";
import { ErrorHandler } from "./ErrorHandler.js";

/**
 * An Incoming Request is what gets passed to every route handler. It includes
 * the raw (unmodified) request, the derived context (user-defined), the parsed
 * URL, the type-safe params `p`, the parsed query string `q`, and a verified
 * JSON body (if a decoder is provided).
 */
type IncomingReq<RC, AC, TParams, TBody> = {
  /**
   * The incoming request.
   */
  readonly req: Request;
  /**
   * The incoming request parsed URL.
   * This is equivalent to the result of `new URL(req.url)`.
   */
  readonly url: URL;
  /**
   * The user-defined static context associated with this request. This is the
   * best place to attach metadata you want to carry around along with the
   * request, without having to monkey-patch the request instance.
   *
   * Use this context for static metadata. Do not use it for auth.
   *
   * Basically the result of calling the configured `getContext()` function on
   * the request.
   */
  readonly ctx: Readonly<RC>;
  /**
   * The result of the authorization check for this request. Basically the
   * result of calling the configured `authorize()` function on the request.
   */
  readonly auth: Readonly<AC>;
  /**
   * The type-safe params available for this request. Automatically derived
   * from dynamic placeholders in the pattern.
   */
  readonly p: TParams;
  /**
   * Convenience accessor for the parsed query string.
   * Equivalent to `Object.entries(url.searchParams)`.
   *
   * Will only contain single strings, even if a query param occurs multiple
   * times. If you need to read all of them, use the `url.searchParams` API
   * instead.
   */
  readonly q: Record<string, string | undefined>;
  /**
   * Verified JSON body for this request, if a decoder instance was provided.
   */
  readonly body: TBody;
};

/**
 * Limited version of an Incoming Request. This incoming request data is
 * deliberately limited until after a successful auth check. Only once the
 * request has been authorized, further parsing will happen.
 */
type PreAuthIncomingReq<RC> = Omit<
  IncomingReq<Readonly<RC>, never, never, never>,
  "auth" | "p" | "q" | "body"
>;

/**
 * Anything that can be returned from an endpoint implementation that would be
 * considered a valid response.
 */
type ResponseLike = Promise<Response | JsonObject> | Response | JsonObject;

// type AuthHandler<R extends Request, RC, TParams> = (
//   input: IncomingReq<R, RC, TParams>
// ) => boolean;

type RouteHandler<RC, AC, TParams, TBody> = (
  input: IncomingReq<RC, AC, TParams, TBody>
) => ResponseLike;

type RouteTuple<RC, AC> = readonly [
  pattern: Pattern,
  matcher: RouteMatcher,
  auth: AuthFn<RC, AC>,
  bodyDecoder: Decoder<unknown> | null,
  handler: OpaqueRouteHandler<RC, AC>,
];

type RouterOptions<RC, AC, TParams extends Record<string, Decoder<unknown>>> = {
  errorHandler?: ErrorHandler;

  // Mandatory config
  /**
   * Automatically handle CORS requests. Either set to `true` (to use all the
   * default CORS options), or specify a CorsOptions object.
   *
   * When enabled, this will do two things:
   * 1. It will respond to pre-flight requests (OPTIONS) automatically.
   * 2. It will add the correct CORS headers to all returned responses.
   *
   * @default false
   */
  cors?: Partial<CorsOptions> | boolean;
  getContext?: (req: Request, ...args: readonly any[]) => RC;
  authorize?: AuthFn<RC, AC>;

  // Register any param decoders
  params?: TParams;

  // Optional config
  debug?: boolean;
};

export type AuthFn<RC, AC> = (
  input: PreAuthIncomingReq<RC>
) => AC | Promise<AC>;

type OpaqueRouteHandler<RC, AC> = (
  input: IncomingReq<RC, AC, OpaqueParams, unknown>
) => Promise<Response>;

type OpaqueParams = Record<string, unknown>;

export class ZenRouter<
  RC,
  AC,
  TParams extends Record<string, Decoder<unknown>> = {},
> {
  #_debug: boolean;
  #_contextFn: (req: Request, ...args: readonly any[]) => RC;
  #_defaultAuthFn: AuthFn<RC, AC>;
  #_routes: RouteTuple<RC, AC>[];
  #_paramDecoders: TParams;
  #_errorHandler: ErrorHandler;
  #_cors: Partial<CorsOptions> | null;

  constructor(options?: RouterOptions<RC, AC, TParams>) {
    this.#_errorHandler = options?.errorHandler ?? new ErrorHandler();
    this.#_debug = options?.debug ?? false;
    this.#_contextFn = options?.getContext ?? (() => null as any as RC);
    this.#_defaultAuthFn =
      options?.authorize ??
      (() => {
        // TODO Maybe make this fail as a 500 with info in the body? Since this is a setup error and should never be an issue in production.
        console.error("This request was not checked for authorization. Please configure a generic `authorize` function in the ZenRouter constructor."); // prettier-ignore
        return abort(403);
      });
    this.#_routes = [];
    this.#_paramDecoders = options?.params ?? ({} as TParams);
    this.#_cors = (options?.cors === true ? {} : options?.cors) || null;
  }

  // --- PUBLIC APIs -----------------------------------------------------------------

  public get fetch(): (
    req: Request,
    ...rest: readonly any[]
  ) => Promise<Response> {
    if (this.#_routes.length === 0) {
      throw new Error("No routes configured yet. Try adding one?");
    }

    return async (req: Request, ...rest: readonly any[]): Promise<Response> => {
      const resp = await this.#_tryDispatch(req, ...rest);
      return this.#_addCorsIfNeeded(req, resp);
    };
  }

  public route<P extends Pattern>(
    pattern: P,
    handler: RouteHandler<
      RC,
      AC,
      ExtractParams<P, MapDecoderTypes<TParams>>,
      never
    >
  ): void;
  public route<P extends Pattern, TBody>(
    pattern: P,
    bodyDecoder: Decoder<TBody>,
    handler: RouteHandler<
      RC,
      AC,
      ExtractParams<P, MapDecoderTypes<TParams>>,
      TBody
    >
  ): void;
  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  public route(first: any, second: any, third?: any): void {
    /* eslint-enable @typescript-eslint/explicit-module-boundary-types */
    const pattern = first;
    const bodyDecoder = arguments.length >= 3 ? second : null;
    const handler = arguments.length >= 3 ? third : second;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    this.#_register(
      pattern,
      bodyDecoder,
      handler as RouteHandler<RC, AC, OpaqueParams, unknown>
    );
  }

  // TODO Maybe remove this on the Router class, since it's only a pass-through method
  public onUncaughtError(handler: ErrorHandlerFn<unknown, RC>): this {
    this.#_errorHandler.onUncaughtError(handler as ErrorHandlerFn<unknown>);
    return this;
  }

  // TODO Maybe remove this on the Router class, since it's only a pass-through method
  public onError(
    handler: ErrorHandlerFn<HttpError | ValidationError, RC>
    //                                  ^^^^^^^^^^^^^^^
    //                                  Technically this isn't needed, because it is a subclass of
    //                                  HttpError already, but adding it here anyway for clarity.
  ): this {
    this.#_errorHandler.onError(handler as ErrorHandlerFn<unknown>);
    return this;
  }

  // public get registerCannedResponse() {
  //   const eh = this.#_errorHandler;
  //   return eh.registerCannedResponse.bind(eh);
  // }

  // --- PRIVATE APIs ----------------------------------------------------------------

  #_getContext(req: Request, ...args: readonly any[]): RC {
    return (
      lookupContext<RC>(req) ??
      attachContext(req, this.#_contextFn(req, ...args))
    );
  }

  #_register<P extends Pattern>(
    pattern: P,
    bodyDecoder: Decoder<unknown> | null,
    handler: RouteHandler<RC, AC, OpaqueParams, unknown>
    // authFn?: OpaqueAuthFn<RC>
  ): void {
    const matcher = routeMatcher(pattern);

    this.#_routes.push([
      pattern,
      matcher,
      /* authFn ?? */ this.#_defaultAuthFn,
      bodyDecoder,
      wrap(handler),
    ]);
  }

  /**
   * Calls .#_dispatch(), but will catch any thrown error (which could be
   * a known HTTP error) or an uncaught error, and makes sure to always return
   * a Response.
   */
  async #_tryDispatch(
    req: Request,
    ...args: readonly any[]
  ): Promise<Response> {
    try {
      return await this.#_dispatch(req, ...args); // eslint-disable @typescript-eslint/no-unsafe-argument
    } catch (err) {
      return this.#_errorHandler.handle(err, { req, ctx: lookupContext(req) });
    }
  }

  #_getAllowedVerbs(req: Request): string[] {
    const url = new URL(req.url);

    const verbs: Set<HttpVerb> = new Set();
    verbs.add("OPTIONS"); // Always include OPTIONS

    // Collect HTTP verbs that are valid for this URL
    for (const [_, matcher] of this.#_routes) {
      // If we already collected this method, avoid the regex matching
      if (verbs.has(matcher.method)) continue;

      const match = matcher.matchURL(url);
      if (match) {
        verbs.add(matcher.method);
      }
    }

    return sortHttpVerbsInPlace(Array.from(verbs));
  }

  #_dispatch_OPTIONS(req: Request): Response {
    // All responses to OPTIONS requests must be 2xx
    return new Response(null, {
      status: 204,
      headers: {
        Allow: this.#_getAllowedVerbs(req).join(", "),
      },
    });
  }

  /**
   * Given an incoming request, starts matching its URL to one of the
   * configured routes, and invoking it if a match is found. Will not (and
   * should not) perform any error handling itself.
   *
   * Can throw:
   * - HTTP 400, if a route matches, but its params are incorrectly encoded
   * - HTTP 403, if a route matches, but the request isn't correctly authorized
   * - HTTP 404, if none of the routes matches
   * - HTTP 405, if a route path matches, but its method did not
   * - HTTP 422, if a route matches, but its body could not be validated
   */
  async #_dispatch(req: Request, ...args: readonly any[]): Promise<Response> {
    if (req.method === "OPTIONS") {
      return this.#_dispatch_OPTIONS(req);
    }

    const url = new URL(req.url);
    const log = this.#_debug
      ? /* istanbul ignore next */
        console.log.bind(console)
      : undefined;
    log?.(`Trying to match ${req.method} ${url.pathname}`);

    // Match routes in the given order
    let pathDidMatch = false;
    for (const tup of this.#_routes) {
      const [pattern, matcher, authorize, bodyDecoder, handler] = tup;

      const match = matcher.matchURL(url);
      if (match === null) {
        log?.(`  ...against ${pattern}? ❌ No match`);
        continue;
      } else {
        pathDidMatch = true;
        if (!matcher.matchMethod(req)) {
          log?.(
            `  ...against ${pattern}? 🧐 Path matches, but method did not! ${JSON.stringify(match)}`
          );
          continue;
        }

        log?.(`  ...against ${pattern}? ✅ Match! ${JSON.stringify(match)}`);

        // Add route pattern as span attribute
        // This is done early so the route is recorded even for auth/validation errors
        const span = trace.getSpan(context.active());
        span?.setAttribute("zen.route", pattern);

        const base = {
          req,
          url,
          ctx: this.#_getContext(req, ...args),
        };

        // Perform auth
        const auth = await authorize(base);
        if (!auth) {
          return abort(403);
        }

        // Verify route params
        let p;
        try {
          p = mapv(match, decodeURIComponent);
          p = mapv(p, (value, key) => {
            const decoder = this.#_paramDecoders[key];
            return decoder === undefined ? value : decoder.verify(value);
          });
        } catch (err) {
          // A malformed URI that cannot be decoded properly or a param that
          // could not be decoded properly are both Bad Requests
          return abort(400);
        }

        // Add decoded route params as span attributes
        for (const [key, value] of Object.entries(p)) {
          span?.setAttribute(`zen.param.${key}`, String(value));
        }

        const decodeResult = bodyDecoder
          ? // TODO: This can throw if the body does not contain a valid JSON
            // request. If so, we should return a 400.
            bodyDecoder.decode(await tryReadBodyAsJson(req))
          : null;

        if (decodeResult && !decodeResult.ok) {
          const errmsg = formatShort(decodeResult.error);
          throw new ValidationError(errmsg);
        }

        // Decode the body
        const input = {
          ...base,
          auth,
          p,
          q: Object.fromEntries(url.searchParams),
          get body() {
            if (decodeResult === null) {
              raise("Cannot access body: this endpoint did not define a body decoder"); // prettier-ignore
            }
            return decodeResult.value;
          },
        };

        return await handler(input);
      }
    }

    if (pathDidMatch) {
      // If one of the paths did match, we can return a 405 error
      return abort(405, { Allow: this.#_getAllowedVerbs(req).join(", ") });
    }

    return abort(404);
  }

  #_addCorsIfNeeded(req: Request, resp: Response): Response {
    if (!this.#_cors) {
      // We don't want to handle CORS
      return resp;
    }

    // Never add CORS headers to the following response codes
    if (
      // Never add to 101 (Switching Protocols) or 3xx (redirect) responses
      resp.status === 101 ||
      (resp.status >= 300 && resp.status < 400)
    ) {
      return resp;
    }

    // If this response already contains the main CORS header, don't touch it
    // further
    if (resp.headers.has(AC_ORIGIN)) {
      // TODO Maybe throw if this happens? It definitely would be unexpected and
      // undesired and it's better to let Zen Router be in control here.
      return resp;
    }

    // If we enabled automatic CORS handling, add necessary CORS headers to the
    // response now
    const corsHeadersToAdd = getCorsHeaders(req, this.#_cors);
    if (corsHeadersToAdd === null) {
      // Not a CORS request, or CORS not allowed
      return resp;
    }

    // This requires a CORS response, so let's add the headers to the returned output
    const headers = new Headers(resp.headers);
    for (const [k, v] of corsHeadersToAdd) {
      if (k === "vary") {
        // Important to not override any existing Vary headers
        headers.append(k, v);
      } else {
        // Here, `k` is an `Access-Control-*` header
        headers.set(k, v);
      }
    }

    // Unfortunately, if we're in a Cloudflare Workers runtime you cannot mutate
    // headers on a Response instance directly (as you can in Node or Bun).
    // So we'll have to reconstruct a new Response instance here :(
    const { status, body } = resp;
    return new Response(body, { status, headers });
  }
}

/**
 * Helper to handle any endpoint handlers returning a JSON object, and turning
 * that into a 200 response if so.
 */
function wrap<RC, AC>(
  handler: RouteHandler<RC, AC, OpaqueParams, unknown>
): OpaqueRouteHandler<RC, AC> {
  return async (input) => {
    const result = await handler(input);
    if (result instanceof Response) {
      return result;
    } else {
      return json(result, 200);
    }
  };
}

/**
 * Attempts to reads the request body as JSON. Will return an empty request
 * body as `undefined`.
 */
// TODO Currently, this helper will not look at or respect the Content-Type
// TODO header, and I think that is a bug.
// TODO Need to think about how to best handle this exactly without breaking
// TODO this API for the "lazy" that never set `content-type` to
// TODO "application/json" explicitly.
async function tryReadBodyAsJson(req: Request): Promise<Json | undefined> {
  // Try reading JSON body
  try {
    const text = await req.text();
    return text === "" ? undefined : (JSON.parse(text) as Json);
  } catch (e) {
    // Invalid JSON body
    abort(400);
  }
}
