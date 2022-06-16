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

const unknownSecretKeyError = new Error(
  'We expect a secret key ("sk_") here, but we found an unknown key instead. Hint: You can find your secret key at https://liveblocks.io/dashboard/apikeys. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize'
);

export async function authorize(
  options: AuthorizeOptions
): Promise<AuthorizeResponse> {
  const { room, userId, userInfo, secret } = options;

  if (!(typeof secret === "string" && secret.length > 0)) {
    return unauthorized(unknownSecretKeyError);
  }

  if (secret.startsWith("pk_")) {
    return unauthorized(
      new Error(
        'We expect a secret key ("sk_") here, but we found a public key ("pk_") instead. Hint: You can find your secret key at https://liveblocks.io/dashboard/apikeys. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize'
      )
    );
  }

  if (!secret.startsWith("sk_")) {
    return unauthorized(unknownSecretKeyError);
  }

  try {
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
    return unauthorized(error);
  }
}

function unauthorized(error?: Error) {
  return {
    status: 403,
    body: 'Call to "https://liveblocks.io/api/authorize" failed. See "error" for more information.',
    error:
      error ||
      new Error(
        "Unknown error. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
      ),
  };
}
