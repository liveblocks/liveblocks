import fetch from "node-fetch";

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
   * The id of the user that try to connect. It should be used to get information about the connected users in the room (name, avatar, etc).
   */
  userId?: string;
  /**
   * The info associated to the user. Can be used to store the name or the profile picture to implement avatar for example. Can't exceed 1KB when serialized as JSON
   */
  userInfo?: unknown; // must be Json
};

type AllAuthorizeOptions = AuthorizeOptions & {
  liveblocksAuthorizeEndpoint?: string;
};

type AuthorizeResponse = {
  status: number;
  body: string;
  error?: Error;
};

export async function authorize(
  options: AuthorizeOptions
): Promise<AuthorizeResponse> {
  try {
    const { room, userId, userInfo, secret } = options;

    if (secret.startsWith("pk_")) {
      throw new Error(
        "Invalid key. You are using the public key which is not supported. Please use the secret key instead. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
      );
    } else if (!secret.startsWith("sk_")) {
      throw new Error(
        "Invalid key. Please use the secret key instead. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
      );
    }

    const result = await fetch(
      (options as AllAuthorizeOptions).liveblocksAuthorizeEndpoint ||
        "https://liveblocks.io/api/authorize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer: ${options.secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room,
          userId,
          userInfo,
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
  } catch (error) {
    return {
      status: 403,
      body: 'Call to "https://liveblocks.io/api/authorize" failed. See "error" for more information.',
      error,
    };
  }
}
