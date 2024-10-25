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
   * This is what .rawFetch() does:    👈 This method!
   *   1. Set Content-Type header
   *   2. Set Authorization header
   *   3. Call the callback to obtain the `authValue` to use in the Authorization header
   *
   * This is what .fetch() does ON TOP of that:
   *   4. Parse response body as Json
   *   5. ...but silently return `{}` if that parsing fails
   *   6. Throw HttpError if response is an error
   */
  private async rawFetch(
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
   * This is what .rawFetch() does:
   *   1. Set Content-Type header
   *   2. Set Authorization header
   *   3. Call the callback to obtain the `authValue` to use in the Authorization header
   *
   * This is what .fetch() does ON TOP of that:   👈 This method!
   *   4. Parse response body as Json
   *   5. ...but silently return `{}` if that parsing fails (🤔)
   *   6. Throw HttpError if response is an error
   */
  private async fetch<T extends JsonObject>(
    endpoint: URLSafeString,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    const response = await this.rawFetch(endpoint, options, params);

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
      // TODO This looks wrong 🤔 !
      // TODO Should we not be throwing this error if something fails to parse?
      body = {} as T;
    }
    return body;
  }

  /**
   * Makes a GET request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .get() instead.
   */
  public async rawGet(
    endpoint: URLSafeString,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<Response> {
    return await this.rawFetch(endpoint, options, params);
  }

  /**
   * Makes a POST request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .post() instead.
   */
  public async rawPost(
    endpoint: URLSafeString,
    body?: JsonObject
  ): Promise<Response> {
    return await this.rawFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Makes a DELETE request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .delete() instead.
   */
  public async rawDelete(endpoint: URLSafeString): Promise<Response> {
    return await this.rawFetch(endpoint, { method: "DELETE" });
  }

  /**
   * Makes a GET request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async get<T extends JsonObject>(
    endpoint: URLSafeString,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<T> {
    return await this.fetch<T>(endpoint, options, params);
  }

  /**
   * Makes a POST request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async post<T extends JsonObject>(
    endpoint: URLSafeString,
    body?: JsonObject,
    options?: Omit<RequestInit, "body" | "method" | "headers">,
    params?: QueryParams
  ): Promise<T> {
    return await this.fetch<T>(
      endpoint,
      {
        ...options,
        method: "POST",
        body: JSON.stringify(body),
      },
      params
    );
  }

  /**
   * Makes a DELETE request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async delete<T extends JsonObject>(
    endpoint: URLSafeString
  ): Promise<T> {
    return await this.fetch<T>(endpoint, { method: "DELETE" });
  }

  /**
   * Makes a PUT request for a Blob body, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async putBlob<T extends JsonObject>(
    endpoint: URLSafeString,
    blob?: Blob,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<T> {
    return await this.fetch<T>(
      endpoint,
      {
        ...options,
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: blob,
      },
      params
    );
  }
}
