import type { AuthValue } from "./auth-manager";
import { HttpError } from "./lib/autoRetry";
import type { JsonObject } from "./lib/Json";
import type { QueryParams, URLSafeString } from "./lib/url";
import { urljoin } from "./lib/url";
import { raise } from "./lib/utils";
import { PKG_VERSION } from "./version";

export function getBearerTokenFromAuthValue(authValue: AuthValue): string {
  if (authValue.type === "public") {
    return authValue.publicApiKey;
  } else {
    return authValue.token.raw;
  }
}

/**
 * @internal
 *
 * Small HTTP client for client-only REST API requests (e.g. /v2/c/* URLs).
 * These URLs all use public key, ID token, or access token authorization. This
 * HTTP client can be shared and used by both the Liveblocks Client and
 * Liveblocks Room instances internally to talk to our client-only REST API
 * backend.
 */
export class HttpClient {
  private _baseUrl: string;
  private _authCallback: () => Promise<AuthValue>;
  private _fetchPolyfill: typeof fetch;

  constructor(
    baseUrl: string,
    fetchPolyfill: typeof fetch,
    authCallback: () => Promise<AuthValue>
  ) {
    this._baseUrl = baseUrl;
    this._fetchPolyfill = fetchPolyfill;
    this._authCallback = authCallback;
  }

  // ------------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------------

  /**
   * Constructs and makes the HTTP request, but does not handle the response.
   *
   * This is what .fetch() does:    👈 This method!
   *   1. Set Content-Type header
   *   2. Set Authorization header
   *   3. Call the callback to obtain the `authValue` to use in the Authorization header
   *
   * This is what .fetchJson() does ON TOP of that:
   *   4. Parse response body as Json
   *   5. ...but silently return `{}` if that parsing fails
   *   6. Throw HttpError if response is an error
   */
  // XXX Ultimately, might be nice to make this a private method? It might be much nicer if this method would _always_ deal with the JSON parsing.
  public async fetch(
    endpoint: URLSafeString,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<Response> {
    if (!endpoint.startsWith("/v2/c/")) {
      raise("This client can only be used to make /v2/c/* requests");
    }

    const url = urljoin(this._baseUrl, endpoint, params);
    return await this._fetchPolyfill(url, {
      ...options,
      headers: {
        // These headers are default, but can be overriden by custom headers
        "Content-Type": "application/json; charset=utf-8",

        // Possible header overrides
        ...options?.headers,

        // Cannot be overriden by custom headers
        Authorization: `Bearer ${getBearerTokenFromAuthValue(await this._authCallback())}`,
        "X-LB-Client": PKG_VERSION || "dev",
      },
    });
  }

  /**
   * Constructs, makes the HTTP request, and handles the response by parsing
   * JSON and/or throwing an HttpError if it failed.
   *
   * This is what .fetch() does:
   *   1. Set Content-Type header
   *   2. Set Authorization header
   *   3. Call the callback to obtain the `authValue` to use in the Authorization header
   *
   * This is what .fetchJson() does ON TOP of that:   👈 This method!
   *   4. Parse response body as Json
   *   5. ...but silently return `{}` if that parsing fails (🤔)
   *   6. Throw HttpError if response is an error
   */
  public async fetchJson<T extends JsonObject>(
    endpoint: URLSafeString,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    const response = await this.fetch(endpoint, options, params);

    if (!response.ok) {
      let error: HttpError;
      try {
        const errorBody = (await response.json()) as { message: string };
        error = new HttpError(errorBody.message, response.status, errorBody);
      } catch {
        error = new HttpError(response.statusText, response.status);
      }
      throw error;
    }

    let body;
    try {
      body = (await response.json()) as T;
    } catch {
      // XXX This looks wrong 🤔 !
      // XXX We should be throwing this error if something fails to parse.
      body = {} as T;
    }
    return body;
  }
}
