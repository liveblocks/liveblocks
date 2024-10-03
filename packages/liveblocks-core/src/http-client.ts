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
// XXXX This class should be used to replace all of the following:
// XXXX
// XXXX From src/client.ts:
// XXXX - fetchRoomApi              (!! Uses `room:read` + `roomId` permissions!)
// XXXX
// XXXX From src/notifications.ts:
// XXXX - fetchJson + createNotificationsApi
//                                 (!! Uses `comments:read` permissions!
//                                   + Updates `currentUserIdStore` as a side effect!)
// XXXX
// XXXX From src/room.ts:
// XXXX - fetchClientApi            (!! Some cases use the current WebSocket's auth token (whatever it is)...
//                                  ...and some cases use `room:read` + `roomId` permissions!)
// XXXX - fetchCommentsApi          (!! Uses `room:read` + `roomId` permissions!)
// XXXX - fetchCommentsJson         (!! Uses `room:read` + `roomId` permissions!)
// XXXX - fetchNotificationsJson    (!! Uses `room:read` + `roomId` permissions!)
//
export class HttpClient {
  private _baseUrl: string;
  private _getAuthToken: () => AuthValue;
  private _fetcher: typeof fetch;

  constructor(
    baseUrl: string,
    getAuthToken: () => AuthValue,
    fetchPolyfill: typeof fetch
  ) {
    this._baseUrl = baseUrl;
    this._getAuthToken = getAuthToken;
    this._fetcher = fetchPolyfill;
  }

  // XXXX This method is yet unused. Start using it!
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
    return await this._fetcher(url, {
      ...options,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...options?.headers,
        Authorization: `Bearer ${getBearerTokenFromAuthValue(this._getAuthToken())}`,
        "X-LB-Client": PKG_VERSION || "dev",
      },
    });
  }

  // ------------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------------
}
