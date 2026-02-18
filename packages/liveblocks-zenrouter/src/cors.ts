import { ALL_HTTP_VERBS } from "./lib/matchers.js";

export type CorsOptions = {
  /**
   * Send CORS headers only if the requested Origin is in this hardcoded list
   * of origins. Note that the default is '*', but this still required all
   * incoming requests to have an Origin header set.
   *
   * @default '*' (allow any Origin)
   */
  allowedOrigins: "*" | string[];
  /**
   * When sending back CORS headers, tell the browser which methods are
   * allowed.
   *
   * @default All methods (you should likely not have to change this)
   */
  allowedMethods: string[];
  /**
   * Specify what headers are safe to allow on _incoming_ CORS requests.
   *
   * By default, all headers requested by the browser client will be allowed
   * (as most headers will typically be ignored by the endpoint handlers), but
   * you can specify a specific whitelist of allowed headers if you need to.
   *
   * Browsers will only ask for non-standard headers if those should be
   * allowed, i.e. a browser can ask in a preflight (OPTIONS) request, if it's
   * okay to send "X-Test", but won't ask if it's okay to send, say,
   * "User-Agent".
   *
   * Note that this is different from the `exposeHeaders` config:
   * - Allowed Headers: which headers a browser may include when
   *                    _making_ the CORS request
   * - Exposed Headers: which headers _returned_ in the CORS response the
   *                    browser is allowed to safely expose to scripts
   *
   * @default '*'
   */
  allowedHeaders: "*" | string[];
  /**
   * The Access-Control-Allow-Credentials response header allows browsers
   * to include include credentials in the next CORS request.
   *
   * Credentials are cookies, TLS client certificates, or WWW-Authentication
   * headers containing a username and password.
   *
   * NOTE: The `Authorization` header is *NOT* considered a credential and as
   * such you don’t need to enable this setting for sending such headers.
   *
   * NOTE: Allowing credentials alone doesn’t cause the browser to send those
   * credentials automatically. For to to happen, make sure to also add `{
   * credentials: "include" }` on the fetch request.
   *
   * WARNING: By default, these credentials are not sent in cross-origin
   * requests, and doing so can make a site vulnerable to CSRF attacks.
   *
   * @default false
   */
  allowCredentials: boolean;
  /**
   * Specify what headers browsers *scripts* can access from the CORS response.
   * This means when a client tries to programmatically read
   * `resp.headers.get('...')`, this header determines which headers will be
   * exposed to that client.
   *
   * Note that this is different from the `allowedHeaders` config:
   * - Allowed Headers: which headers a browser may include when
   *                    _making_ the CORS request
   * - Exposed Headers: which headers _returned_ in the CORS response the
   *                    browser is allowed to safely expose to scripts
   *
   * By default, browser scripts can only read the following headers from such
   * responses:
   * - Cache-Control
   * - Content-Language
   * - Content-Type
   * - Expires
   * - Last-Modified
   * - Pragma
   */
  exposeHeaders: string[];
  maxAge?: number;
  /**
   * When `allowedOrigins` isn't an explicit list of origins but '*' (= the
   * default), normally the Origin will get allowed by echoing the Origin value
   * back. When this option is set, it will instead allow '*'.
   *
   * Do not use this in combination with `allowCredentials` as this is not
   * allowed by the spec.
   *
   * @default false
   *
   */
  sendWildcard: boolean;
  /**
   * Always send CORS headers on all responses, even if the request didn't
   * contain an Origin header and thus isn't interested in CORS.
   *
   * @default true
   */
  alwaysSend: boolean;
  /**
   * Normally, when returning a CORS response, it's a good idea to set the
   * Vary header to include 'Origin', to behave better with caching. By default
   * this will be done. If you don't want to auto-add the Vary header, set this
   * to false.
   *
   * @default true
   */
  varyHeader: boolean;
};

// Maybe make some of these overridable? But for now keep these the defaults
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  allowedOrigins: "*",
  allowedMethods: ALL_HTTP_VERBS,
  allowedHeaders: "*", // By default, allow all incoming headers (we'll ignore most of them anyway)
  allowCredentials: false,
  exposeHeaders: [],
  maxAge: undefined,
  sendWildcard: false,
  alwaysSend: true,
  varyHeader: true,
};

// Output Response Headers
export const AC_ORIGIN = "Access-Control-Allow-Origin";
const AC_METHODS = "Access-Control-Allow-Methods";
const AC_ALLOW_HEADERS = "Access-Control-Allow-Headers";
const AC_EXPOSE_HEADERS = "Access-Control-Expose-Headers";
const AC_CREDENTIALS = "Access-Control-Allow-Credentials";
const AC_MAX_AGE = "Access-Control-Max-Age";

// Incoming Request Headers
const AC_REQUEST_METHOD = "Access-Control-Request-Method";
const AC_REQUEST_HEADERS = "Access-Control-Request-Headers";

/**
 * Computes the value of the Access-Control-Allow-Origin header.
 * Either will be the Request's Origin header echoed back, or a "*".
 * Returns `null` if the response should not include any CORS headers.
 */
function getCorsOrigin(options: CorsOptions, req: Request): string | null {
  if (options.sendWildcard && options.allowCredentials) {
    // This combination is not allowed by the spec
    throw new Error("Invalid CORS configuration");
  }

  const allowAll = options.allowedOrigins === "*";
  const explicitOrigins = allowAll ? [] : (options.allowedOrigins as string[]);

  const origin =
    req.headers.get("Origin") ??
    // --------------------------------------------------------------------------------
    // WARNING: Non-standard HTTP hack here!
    // --------------------------------------------------------------------------------
    // Note that X-Relay-Origin is not an HTTP standard! This is done, because the
    // default `fetch()` API will not allow you to manually set the Origin for
    // a request, as it's considered a forbidden header :(
    //
    // This custom header gets set here:
    // https://github.com/liveblocks/liveblocks.io/blob/862935833aa754cb419f2e5e8f7c32fb50e89de1/pages/api/public/authorize.ts#L69-L73
    // --------------------------------------------------------------------------------
    req.headers.get("X-Relay-Origin");

  // If the Origin header is not present terminate this set of steps.
  // The request is outside the scope of this specification.-- W3Spec
  if (origin) {
    // If the allowed origins is an asterisk or 'wildcard', always match
    if (allowAll && options.sendWildcard) {
      return "*";
    } else if (allowAll || explicitOrigins.includes(origin)) {
      // Add a single Access-Control-Allow-Origin header, with either
      // the value of the Origin header or the string "*" as value.
      // -- W3Spec
      return origin;
    } else {
      // The request's Origin header does not match any of allowed origins, so
      // send no CORS-allowed headers back
      return null;
    }
  } else if (options.alwaysSend) {
    // Usually, if a request doesn’t include an Origin header, the client did
    // not request CORS. This means we can ignore this request. However, if
    // this is true, a most-likely-to-be-correct value is still set.
    if (allowAll) {
      // If wildcard is in the origins, even if `sendWildcard` is False,
      // simply send the wildcard. Unless supportsCredentials is True,
      // since that is forbidded by the spec..
      // It is the most-likely to be correct thing to do (the only other
      // option is to return nothing, which almost certainly not what
      // the developer wants if the '*' origin was specified.
      if (options.allowCredentials) {
        return null;
      } else {
        return "*";
      }
    } else {
      // Since there can be only one origin sent back, send back the first one
      // as a best-effort
      return explicitOrigins[0] ?? /* istanbul ignore next -- @preserve */ null;
    }
  } else {
    // The request did not contain an 'Origin' header. This means the browser or client did not request CORS, ensure the Origin Header is set
    return null;
  }
}

function getHeadersToAllow(allowed: "*" | string[], req: Request) {
  const requested = (req.headers.get(AC_REQUEST_HEADERS) ?? "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result =
    allowed === "*" ? requested : requested.filter((h) => allowed.includes(h));
  return result.length > 0 ? result : null;
}

/**
 * Returns CORS headers to attach to the Response for this request.
 *
 * For both preflight and non-preflight requests:
 * - Will set the AC-Allow-Origin header, echoing back the Origin
 * - Optionally, will set AC-Allow-Credentials and AC-Expose-Headers headers
 *     (depending on your config)
 * - Set the Vary header accordingly
 *
 * For preflight-requests only:
 * - Will additionally set AC-Allow-Method and/or AC-Allow-Headers headers
 *     (these don't have to be on the non-preflight requests)
 *
 * Returns `null` for non-CORS requests, or if CORS should not be allowed.
 */
export function getCorsHeaders(
  req: Request,
  opts: Partial<CorsOptions>
): Headers | null {
  const options = { ...DEFAULT_CORS_OPTIONS, ...opts } as CorsOptions;
  const originToSet = getCorsOrigin(options, req);

  if (originToSet === null) {
    // CORS is not enabled for this route
    return null;
  }

  // Construct the CORS headers to put on the response
  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin#syntax
  const headers: Headers = new Headers();
  headers.set(AC_ORIGIN, originToSet);
  if (options.exposeHeaders.length > 0) {
    headers.set(AC_EXPOSE_HEADERS, options.exposeHeaders.join(", "));
  }
  if (options.allowCredentials) {
    headers.set(AC_CREDENTIALS, "true"); // case-sensitive
  }

  // This is a preflight request
  // http://www.w3.org/TR/cors/#resource-preflight-requests
  if (req.method === "OPTIONS") {
    const requestedMethod = (
      req.headers.get(AC_REQUEST_METHOD) ?? ""
    ).toUpperCase();

    // If there is no Access-Control-Request-Method header or if parsing
    // failed, do not set any additional headers
    if (requestedMethod && options.allowedMethods.includes(requestedMethod)) {
      const headersToAllow = getHeadersToAllow(options.allowedHeaders, req);
      if (headersToAllow) {
        headers.set(AC_ALLOW_HEADERS, headersToAllow.join(", "));
      }
      if (options.maxAge) {
        headers.set(AC_MAX_AGE, String(options.maxAge));
      }
      // TODO Optionally, intersect resp.headers.get('Allow') with
      // options.allowedMethods, but it won’t matter much
      headers.set(AC_METHODS, options.allowedMethods.join(", "));
    } else {
      console.log(
        "The request's Access-Control-Request-Method header does not match allowed methods. CORS headers will not be applied."
      );
    }
  }

  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin#cors_and_caching
  if (options.varyHeader) {
    if (headers.get(AC_ORIGIN) === "*") {
      // Never set a Vary: Origin header if Origin is returned as "*"
    } else {
      headers.set("Vary", "Origin");
    }
  }

  return headers;
}
