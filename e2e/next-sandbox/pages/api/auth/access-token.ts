import { nn, type Permission as PermissionToken } from "@liveblocks/core";
import { Liveblocks } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

import { getUser, randomUser } from "../_utils";

const SECRET_KEY = nn(
  process.env.LIVEBLOCKS_SECRET_KEY,
  "Please specify LIVEBLOCKS_SECRET_KEY env var"
);

const liveblocks = new Liveblocks({
  secret: SECRET_KEY,
  baseUrl: nn(
    process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
    "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
  ),
});

type QueryValue = string | string[] | undefined;

function getQueryValues(value: QueryValue) {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

function getPermissions(value: QueryValue) {
  const scopes = getQueryValues(value);

  return scopes as PermissionToken[] | undefined;
}

export default async function accessTokenAuth(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const id = Number(req.query.user);
  const user = !isNaN(id) ? getUser(id) : randomUser();

  const session = liveblocks.prepareSession(
    // Unique user ID
    `user-${user.id}`,
    {
      userInfo: {
        name: user.name,
        issuedBy: "/api/auth/access-token",
        echo: Number(req.query.echo) || undefined,
      },
    }
  );

  const permissions = getPermissions(req.query.permissions);
  session.allow("e2e*", permissions ?? session.FULL_ACCESS);
  const response = await session.authorize();
  res.status(response.status).end(response.body);
}
