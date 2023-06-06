import { authorize, buildSimpleRoomPermissions } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(403).end();
  }

  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const userIndex = Math.floor(Math.random() * NAMES.length);
  const response = await authorize({
    secret: API_KEY,
    userId: `user-${userIndex}`,
    permissions: buildSimpleRoomPermissions(req.body.room),
    // OR  permissions: buildSimpleMyAccessPermissions("organization-123.*"),
    // OR  permissions: [{ resource: "organization-123.*", scopes: ["comment:read"]}]
    userInfo: {
      name: NAMES[userIndex],
      picture: `https://liveblocks.io/avatars/avatar-${Math.floor(
        Math.random() * 30
      )}.png`,
    },
  });
  return res.status(response.status).end(response.body);
}

const NAMES = [
  "Charlie Layne",
  "Mislav Abha",
  "Tatum Paolo",
  "Anjali Wanda",
  "Jody Hekla",
  "Emil Joyce",
  "Jory Quispe",
  "Quinn Elton",
];
