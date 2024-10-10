import type { AuthValue } from "./auth-manager";
import type { JsonObject } from "./lib/Json";
import type { QueryParams, URLSafeString } from "./lib/url";
import { urljoin } from "./lib/url";
import { raise } from "./lib/utils";
import { PKG_VERSION } from "./version";

export class CommentsApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: JsonObject
  ) {
    super(message);
  }
}

export class NotificationsApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: JsonObject
  ) {
    super(message);
  }
}

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
//
// XXX This class should be used to replace all of the following:
// XXX
// XXX From src/notifications.ts:
// XXX - ✅ fetchJson + createNotificationsApi
// XXX                             (!! Uses `comments:read` permissions!
// XXX                               + Updates `currentUserIdStore` as a side effect!)
// XXX
// XXX From src/room.ts:
// XXX - ✅ fetchClientApi         (!! Some cases use the current WebSocket's auth token (whatever it is)...
// XXX                              ...and some cases use `room:read` + `roomId` permissions!)
// XXX - ✅ fetchCommentsApi       (!! Uses `room:read` + `roomId` permissions!)
// XXX - ✅ fetchCommentsJson      (!! Uses `room:read` + `roomId` permissions!)
// XXX - ✅ fetchNotificationsJson (!! Uses `room:read` + `roomId` permissions!)
//
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

  /**
   * Constructs and makes the HTTP request, but does not handle the response.
   */
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

  // ------------------------------------------------------------------
  // XXX Temporary methods
  // ------------------------------------------------------------------

  // XXX Try to DRY up this method with the other fetchJson_for* methods in here
  //
  // This will:
  // 1. Set Content-Type header
  // 2. Set Authorization header
  // 3. Call the callback to obtain the `authValue` to use in the Authorization header
  // 4. Parse response body as Json
  // 5. ...but silently return `{}` if that parsing fails
  // 6. Throw NotificationsApiError if response is an error
  public async fetchJson_forNotifications<T extends JsonObject>(
    endpoint: URLSafeString,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    const response = await this.fetch(endpoint, options, params);

    // XXX Maybe DRY up and transfer this error handling to HttpClient's fetch method too?
    if (!response.ok) {
      if (response.status >= 400 && response.status < 600) {
        let error: NotificationsApiError;

        try {
          const errorBody = (await response.json()) as { message: string };

          error = new NotificationsApiError(
            errorBody.message,
            response.status,
            errorBody
          );
        } catch {
          error = new NotificationsApiError(
            response.statusText,
            response.status
          );
        }

        throw error;
      }
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

  // XXX Try to DRY up this method with the other fetchJson_for* methods in here
  //
  // This will:
  // 1. Set Content-Type header
  // 2. Set Authorization header
  // 3. Call the callback to obtain the `authValue` to use in the Authorization header
  // 4. Parse response body as Json
  // 5. ...but silently return `{}` if that parsing fails
  // 6. Throw CommentsApiError if response is an error
  public async fetchJson_forComments<T>(
    endpoint: URLSafeString,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    const response = await this.fetch(endpoint, options, params);

    // XXX Maybe DRY up and transfer this error handling to HttpClient's fetch method too?
    if (!response.ok) {
      if (response.status >= 400 && response.status < 600) {
        let error: CommentsApiError;

        try {
          const errorBody = (await response.json()) as { message: string };

          error = new CommentsApiError(
            errorBody.message,
            response.status,
            errorBody
          );
        } catch {
          error = new CommentsApiError(response.statusText, response.status);
        }

        throw error;
      }
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

  // ------------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------------
}
