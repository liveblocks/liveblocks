import fetch from "node-fetch";
export type {
  StorageUpdatedEvent,
  UserEnteredEvent,
  UserLeftEvent,
  WebhookEvent,
  WebhookRequest,
} from "./webhooks";
export { WebhookHandler } from "./webhooks";

type AuthorizeOptions = {
  /**
   * The secret api provided at https://liveblocks.io/dashboard/apikeys
   */
  secret: string;
  /**
   * The room provided in the authorization request body
   */
  room: string;
  /**
   * The id of the user that try to connect. It can be used to get information about the connected users in the room (name, avatar, etc).
   * It can also be used to generate a token that gives access to a private room where the userId is configured in the room accesses.
   * Liveblocks uses the userId to calculate your account's Monthly Active Users.
   */
  userId: string;
  /**
   * The info associated to the user. Can be used to store the name or the profile picture to implement avatar for example. Can't exceed 1KB when serialized as JSON
   */
  userInfo?: unknown; // must be Json
  /**
   * The ids of the groups to which the user belongs. It should be used to generate a token that gives access to a private room and at least one of the group is configured in the room accesses.
   */
  groupIds?: string[];
};

type AllAuthorizeOptions = AuthorizeOptions & {
  liveblocksAuthorizeEndpoint?: string;
};

type AuthorizeResponse = {
  status: number;
  body: string;
  error?: Error;
};

/**
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
    const { room, secret, userId, userInfo, groupIds } = options;

    if (!(typeof room === "string" && room.length > 0)) {
      throw new Error(
        "Invalid room. Please provide a non-empty string as the room. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
      );
    }

    if (!(typeof userId === "string" && userId.length > 0)) {
      throw new Error(
        "Invalid userId. Please provide a non-empty string as the userId. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
      );
    }

    const result = await fetch(
      buildLiveblocksAuthorizeEndpoint(options as AllAuthorizeOptions, room),
      {
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
      }
    );

    if (!result.ok) {
      return {
        status: 403,
        body: await result.text(),
      };
    }

    return {
      status: 200,
      body: await result.text(),
    };
  } catch (er) {
    return {
      status: 403,
      body: 'Call to "https://api.liveblocks.io/v2/rooms/:roomId/authorize" failed. See "error" for more information.',
      error: er as Error | undefined,
    };
  }
}

function buildLiveblocksAuthorizeEndpoint(
  options: AllAuthorizeOptions,
  roomId: string
): string {
  // INTERNAL override for testing purpose.
  if (options.liveblocksAuthorizeEndpoint) {
    return options.liveblocksAuthorizeEndpoint.replace("{roomId}", roomId);
  }

  return `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(
    roomId
  )}/authorize`;
}
