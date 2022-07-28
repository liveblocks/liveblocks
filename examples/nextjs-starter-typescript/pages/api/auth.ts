import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
const API_KEY_WARNING = noKeyWarning();

// Auth endpoint is called from within `/liveblocks.config.ts`
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
    return res.status(403).end();
  }

  // Do your authentication here
  // Pass any necessary data/tokens to this endpoint within the body
  // More info in `/liveblocks.config.ts`

  // Get current user's info from your API
  const userId = req.body.userId;
  const { name, color, picture } = await getUserInfo(userId);

  // Authenticate Liveblocks and return token
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const response = await authorize({
    room: req.body.room,
    secret: API_KEY,

    // `userId` is a property that can be assigned to each user, to help on the client end
    userId: `${userId}`,

    // `userInfo` data will be available to use in Liveblocks hooks for cursors, avatars etc.
    // Add your custom user info here
    userInfo: { name, color, picture },
  });
  return res.status(response.status).end(response.body);
}

// Simulating calling an API and getting a user's info
async function getUserInfo(userId: number) {
  return {
    name: NAMES[userId],
    color: COLORS[userId],

    // Uncomment to see picture avatars
    // picture: `/avatars/${userId}.png`,
    picture: undefined,
  }
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

const COLORS = [
  "#E4439F",
  "#ff9700",
  "#10b5e8",
  "#2f13e7",
  "#48C9A1",
  "#64c948",
  "#ce521d",
  "#eadf06",
];

// Just checking you have your liveblocks.io API key added, can be removed
function noKeyWarning() {
  return process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-starter-typescript-tailwind#codesandbox.\n`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-starter-typescript-tailwind#getting-started.\n`;
}
