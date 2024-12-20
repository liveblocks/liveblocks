import { nn } from "@liveblocks/core";
import type { NextApiRequest, NextApiResponse } from "next";

import { randomUser } from "../_utils";

//
// NOTE:
// This `authorize` call used to be a public API in @liveblocks/node<2.0. It's
// been removed since, but by copying the legacy implementation here into the
// test suite, we can still simulate old clients using this token type, until
// we stop supporting it in the backend.
//
async function authorize(options: {
  room: string;
  userId: string;
  userInfo: Record<string, string>;
  secret: string;
}) {
  let url = null;
  try {
    const { room, secret, userId, userInfo } = options;

    url = new URL(
      `/v2/rooms/${encodeURIComponent(room)}/authorize`,
      nn(
        process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
        "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
      )
    );

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        userInfo,
      }),
    });

    return {
      status: resp.status,
      body: await resp.text(),
    };
  } catch (er) {
    return {
      status: 503 /* Service Unavailable */,
      body:
        (url
          ? `Call to "${url.toString()}" failed.`
          : "Invalid authorize request.") +
        ' See "error" for more information.',
      error: er as Error | undefined,
    };
  }
}

const SECRET_KEY = nn(
  process.env.LIVEBLOCKS_SECRET_KEY,
  "Please specify LIVEBLOCKS_SECRET_KEY env var"
);

export default async function legacyAuth(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const room = (req.body as { room: string }).room;
  const user = randomUser();

  const response = await authorize({
    room,
    userId: `user-${user.id}`,
    userInfo: {
      name: user.name,
      issuedBy: "/api/auth/legacy-token",
    },
    secret: SECRET_KEY,
  });
  res.status(response.status).end(response.body);
}
