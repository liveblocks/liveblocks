import { assertNonEmpty, fetchPolyfill, normalizeStatusCode } from "./utils";

/**
 * TODO Officially mark as DEPRECATED, point to migration guide.
 */
type AuthorizeOptions = {
  /**
   * The secret API key for your Liveblocks account. You can find it on
   * https://liveblocks.io/dashboard/apikeys
   */
  secret: string;
  /**
   * The room ID for which to authorize the user. This will authorize the user
   * to enter the Liveblocks room.
   */
  room: string;
  /**
   * Associates a user ID to the session that is being authorized. The user ID
   * is typically set to the user ID from your own database.
   *
   * It can also be used to generate a token that gives access to a private
   * room where the userId is configured in the room accesses.
   *
   * This user ID will be used as the unique identifier to compute your
   * Liveblocks account's Monthly Active Users.
   */
  userId: string;
  /**
   * Arbitrary metadata associated to this user session.
   *
   * You can use it to store a small amount of static metadata for a user
   * session. It is public information, that will be visible to other users in
   * the same room, like name, avatar URL, etc.
   *
   * It's only suitable for static info that won't change during a session. If
   * you want to store dynamic metadata on a user session, don't keep that in
   * the session token, but use Presence instead.
   *
   * Can't exceed 1KB when serialized as JSON.
   */
  userInfo?: unknown;
  /**
   * Tell Liveblocks which group IDs this user belongs to. This will authorize
   * the user session to access private rooms that have at least one of these
   * group IDs listed in their room access configuration.
   *
   * See https://liveblocks.io/docs/guides/managing-rooms-users-permissions#permissions
   * for how to configure your room's permissions to use this feature.
   */
  groupIds?: string[];

  /**
   * @internal
   * Can be overriden for testing purposes only.
   */
  liveblocksAuthorizeEndpoint?: string;
};

/**
 * TODO Officially mark as DEPRECATED, point to migration guide.
 */
type AuthorizeResponse = {
  status: number;
  body: string;
  error?: Error;
};

/**
 * @deprecated Since 1.2, we’re deprecating single-room tokens in favor of
 * either access tokens or ID tokens. Single-room tokens are still supported,
 * but support for them will be dropped in the future. Please refer to our
 * Upgrade Guide to learn how to adopt the new-style authorization, see
 * https://liveblocks.io/docs/platform/upgrading/1.2
 *
 * Tells Liveblocks that a user should be allowed access to a room, which user
 * this session is for, and what metadata to associate with the user (like
 * name, avatar, etc.)
 *
 * @example
 * export default async function auth(req, res) {
 *
 * // Implement your own security here.
 *
 * const room = req.body.room;
 * const response = await authorize({
 *   room,
 *   secret,
 *   userId: "123",
 *   userInfo: {    // Optional
 *     name: "Ada Lovelace"
 *   },
 *   groupIds: ["group1"] // Optional
 * });
 * return res.status(response.status).end(response.body);
 * }
 */
export async function authorize(
  options: AuthorizeOptions
): Promise<AuthorizeResponse> {
  try {
    const { room, secret, userId, userInfo, groupIds } =
      // Ensure we'll validate inputs at runtime
      options as Record<string, unknown>;

    assertNonEmpty(secret, "secret");
    assertNonEmpty(room, "room");
    assertNonEmpty(userId, "userId");

    const fetch = await fetchPolyfill();
    const resp = await fetch(buildLiveblocksAuthorizeEndpoint(options, room), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        userInfo,
        groupIds,
      }),
    });

    return {
      status: normalizeStatusCode(resp.status),
      body: await resp.text(),
    };
  } catch (er) {
    return {
      status: 503 /* Service Unavailable */,
      body: 'Call to "https://api.liveblocks.io/v2/rooms/:roomId/authorize" failed. See "error" for more information.',
      error: er as Error | undefined,
    };
  }
}

function buildLiveblocksAuthorizeEndpoint(
  options: AuthorizeOptions,
  roomId: string
): string {
  if (options.liveblocksAuthorizeEndpoint) {
    return options.liveblocksAuthorizeEndpoint.replace(
      "{roomId}",
      encodeURIComponent(roomId)
    );
  }

  return `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(
    roomId
  )}/authorize`;
}
