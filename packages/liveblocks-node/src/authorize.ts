import fetch from "node-fetch";

enum LiveblocksScope {
  RoomWrite = "room:write",
  RoomRead = "room:read",
  RoomPresenceWrite = "room:presence:write",
  MyAccess = "my:access",
  CommentWrite = "comment:write",
  CommentRead = "comment:read",
  Events = "events",
}

type LiveblocksPermissions = Record<string, LiveblocksScope[]>;

type AuthorizeOptions = {
  /**
   * The secret API key for your Liveblocks account. You can find it on
   * https://liveblocks.io/dashboard/apikeys
   */
  secret: string;

  /**
   * The permissions to grant to the user. This will authorize the user to access
   * the different resources with the specified scopes.
   */
  permissions: LiveblocksPermissions;

  /**
   * Associates a user ID to the session that is being authorized. The user ID
   * is typically set to the user ID from your own database.
   *
   * If the permissions contain the scope "my:access". The userId will be used to check
   * if the user has access to the room based on the room accesses that you configured.
   *
   *
   * This user ID will be used as the unique identifier to compute your
   * Liveblocks account's Monthly Active Users.
   */
  userId: string;

  /**
   * If the permissions contain the scope "my:access". The group Ids will be used to check
   * if the user has access to the room based on the room accesses that you configured.
   *
   * See https://liveblocks.io/docs/guides/managing-rooms-users-permissions#permissions
   * for how to configure your room's permissions to use this feature.
   */
  groupIds?: string[];

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
};

/** @internal */
type AllAuthorizeOptions = AuthorizeOptions & {
  liveblocksAuthorizeEndpoint?: string;
};

type AuthorizeResponse = {
  status: number;
  body: string;
  error?: Error;
};

/**
 * Get a token from Liveblocks that gives a user access to the requested resousces with the specified access scopes.
 *
 * @example
 * export default async function auth(req, res) {
 *
 * // Implement your own security here.
 *
 * const room = req.body.room;
 * const response = await authorize({
 *   secret,
 *   userId: "123",
 *   permissions: buildSimpleRoomPermissions(room.id),
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
    const { permissions, secret, userId, userInfo, groupIds } = options;

    if (!(typeof userId === "string" && userId.length > 0)) {
      throw new Error(
        "Invalid userId. Please provide a non-empty string as the userId. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
      );
    }

    const resp = await fetch(buildLiveblocksAuthorizeEndpoint(options), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        permissions,
        userInfo,
        groupIds,
      }),
    });

    if (resp.ok) {
      return {
        status: 200 /* OK */,
        body: await resp.text(),
      };
    }

    if (resp.status >= 500) {
      return {
        status: 503 /* Service Unavailable */,
        body: await resp.text(),
      };
    } else {
      return {
        status: 403 /* Unauthorized */,
        body: await resp.text(),
      };
    }
  } catch (er) {
    return {
      status: 503 /* Service Unavailable */,
      body: 'Call to "https://api.liveblocks.io/v2/rooms/:roomId/authorize" failed. See "error" for more information.',
      error: er as Error | undefined,
    };
  }
}

/**
 * The token returned will give permission to enter a room and read and update the storage.
 */
export function buildSimpleRoomPermissions(
  roomId: string,
  scopes?: LiveblocksScope[]
): LiveblocksPermissions {
  return {
    [roomId]: scopes || [LiveblocksScope.RoomWrite],
  };
}

/**
 * The token returned will give permission to all the rooms which have access configured in Liveblocks for the userId and groupIds provided.
 */
export function buildSimpleMyAccessPermissions(
  resource?: string
): LiveblocksPermissions {
  const resourceKey = resource ? resource : "*";
  return {
    [resourceKey]: [LiveblocksScope.MyAccess],
  };
}

function buildLiveblocksAuthorizeEndpoint(
  options: AllAuthorizeOptions
): string {
  // INTERNAL override for testing purpose.
  if (options.liveblocksAuthorizeEndpoint) {
    return options.liveblocksAuthorizeEndpoint;
  }

  return `https://api.liveblocks.io/v2/authorize`;
}
