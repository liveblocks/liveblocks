import type { AuthValue } from "./auth-manager";
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
//
// XXX This class should be used to replace all of the following:
// XXX
// XXX From src/client.ts:
// XXX - fetchRoomApi              (!! Uses `room:read` + `roomId` permissions!)
// XXX
// XXX From src/notifications.ts:
// XXX - fetchJson + createNotificationsApi
//                                 (!! Uses `comments:read` permissions!
//                                   + Updates `currentUserIdStore` as a side effect!)
// XXX
// XXX From src/room.ts:
// XXX - fetchClientApi            (!! Some cases use the current WebSocket's auth token (whatever it is)...
//                                  ...and some cases use `room:read` + `roomId` permissions!)
// XXX - fetchCommentsApi          (!! Uses `room:read` + `roomId` permissions!)
// XXX - fetchCommentsJson         (!! Uses `room:read` + `roomId` permissions!)
// XXX - fetchNotificationsJson    (!! Uses `room:read` + `roomId` permissions!)
//
export class HttpClient {
  private _baseUrl: string;
  private _getAuthToken: () => AuthValue;
  private _fetchPolyfill: typeof fetch;

  constructor(
    baseUrl: string,
    getAuthToken: () => AuthValue,
    fetchPolyfill: typeof fetch
  ) {
    this._baseUrl = baseUrl;
    this._getAuthToken = getAuthToken;
    this._fetchPolyfill = fetchPolyfill;
  }

  // XXX This method is yet unused. Start using it!
  // @ts-expect-error
  private async fetch(
    endpoint: URLSafeString,
    options?: RequestInit,
    params?: QueryParams
  ) {
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
        Authorization: `Bearer ${getBearerTokenFromAuthValue(this._getAuthToken())}`,
        "X-LB-Client": PKG_VERSION || "dev",
      },
    });
  }

  // ------------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------------
}
