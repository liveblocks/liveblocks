import { assertNonEmpty, normalizeStatusCode, urljoin } from "./utils";
import type { PermissionSet } from "./PermissionSet";
export { FULL_ACCESS, PermissionSet, READ_ACCESS } from "./PermissionSet";

export type LiveblocksOptions = {
  secret: string;

  /**
   * @internal
   * Allow overriding the base URL for testing purposes only.
   * Default value is https://api.liveblocks.io
   */
  liveblocksBaseUrl?: string;
};

const DEFAULT_BASE_URL = "https://api.liveblocks.io";

type AuthResponse = {
  status: number;
  body: string;
  error?: Error;
};

type Identity = {
  userId: string;
  groupIds: string[];
};

export class Liveblocks {
  private readonly _secret: string;
  private readonly _baseUrl: URL;

  constructor(options: LiveblocksOptions) {
    const options_ = options as Record<string, unknown>;
    const secret = options_.secret;
    assertNonEmpty(secret, "secret"); // TODO: Also fail if this isn't a pk_XXXXXXXXX-shaped string
    this._secret = secret;
    this._baseUrl = new URL(
      typeof options_.liveblocksBaseUrl === "string"
        ? options_.liveblocksBaseUrl
        : DEFAULT_BASE_URL
    );
  }

  private async post(path: `/${string}`, json: Record<string, unknown>) {
    const url = urljoin(this._baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this._secret}`,
      "Content-Type": "application/json",
    };
    return fetch(url, { method: "POST", headers, body: JSON.stringify(json) });
  }

  /**
   * Call this to authorize the user to access Liveblocks, and to describe
   * exactly what permissions this user should have.
   *
   * IMPORTANT:
   * Always verify that you trust the user making the request before calling
   * .authorizeUser()!
   *
   * Note that this will return a Liveblocks "access token". Anyone that
   * obtains such access token will have access to the allowed resources.
   *
   * @param userId Tell Liveblocks the user ID of the user to authorize. Must
   * uniquely identify the user account in your system. The uniqueness of this
   * value will determine how many MAUs will be counted/billed.
   *
   * @param permissions The PermissionSet instance describing what this user
   * should have access to precisely.
   *
   * @param options.userInfo Custom metadata to attach to this user. Data you
   * add here will be visible to all other clients in the room, through the
   * `other.info` property.
   */
  public async authorizeUser(
    userId: string,
    permissions: PermissionSet,
    options?: {
      userInfo: unknown;
    }
  ): Promise<AuthResponse> {
    permissions.seal();
    if (permissions.isEmpty()) {
      return {
        status: 403,
        body: "Forbidden",
      };
    }

    try {
      assertNonEmpty(userId, "userId"); // TODO: Check if this is a legal userId value too

      const resp = await this.post("/v2/authorize-user", {
        // Required
        userId,
        permissions,

        // Optional metadata
        userInfo: options?.userInfo,
      });

      return {
        status: normalizeStatusCode(resp.status),
        body: await resp.text(),
      };
    } catch (er) {
      return {
        status: 503 /* Service Unavailable */,
        body: `Call to ${urljoin(
          this._baseUrl,
          "/v2/authorize"
        )} failed. See "error" for more information.`,
        error: er as Error | undefined,
      };
    }
  }

  /**
   * Call this to authenticate the user as an actor you want to allow to use
   * Liveblocks.
   *
   * You should use this method only if you want to manage your permissions
   * through the Liveblocks Permissions API. This method is more complicated to
   * set up, but allows for finer-grained specification of permissions.
   *
   * Calling `.identifyUser()` only lets you securely identify a user (and what
   * groups they belong to). What permissions this user will end up having is
   * determined by whatever permissions you assign the user/group in your
   * Liveblocks account, through the Permissions API:
   * https://liveblocks.io/docs/rooms/permissions
   *
   * IMPORTANT:
   * Always verify that you trust the user making the request before calling
   * .identifyUser()!
   *
   * @param identity Tell Liveblocks the user ID of the user to authenticate.
   * Must uniquely identify the user account in your system. The uniqueness of
   * this value will determine how many MAUs will be counted/billed.
   *
   * If you also want to assign which groups this user belongs to, use the
   * object form and specify the `groupIds` property. Those `groupIds` should
   * match the groupIds you assigned permissions to via the Liveblocks
   * Permissions API, see
   * https://liveblocks.io/docs/rooms/permissions#permissions-levels-groups-accesses-example
   *
   * @param options.userInfo Custom metadata to attach to this user. Data you
   * add here will be visible to all other clients in the room, through the
   * `other.info` property.
   */
  // These fields define the security identity of the user. Whatever you pass in here will define which
  public async identifyUser(
    identity:
      | string // Shorthand for userId
      | Identity,
    options?: {
      userInfo: unknown;
      // ....
    }
  ): Promise<AuthResponse> {
    const userId = typeof identity === "string" ? identity : identity.userId;
    const groupIds =
      typeof identity === "string" ? undefined : identity.groupIds;

    try {
      assertNonEmpty(userId, "userId"); // TODO: Check if this is a legal userId value too
      // assertStringArrayOrUndefined(groupsIds, "groupIds"); // TODO: Check if this is a legal userId value too

      const resp = await this.post("/v2/identify-user", {
        userId,
        groupIds,

        // Optional metadata
        userInfo: options?.userInfo,
      });

      return {
        status: normalizeStatusCode(resp.status),
        body: await resp.text(),
      };
    } catch (er) {
      return {
        status: 503 /* Service Unavailable */,
        body: `Call to ${urljoin(
          this._baseUrl,
          "/v2/identify"
        )} failed. See "error" for more information.`,
        error: er as Error | undefined,
      };
    }
  }
}
