import { Liveblocks, authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // For the cursor example, we're generating random users
  // and set their info from the authentication endpoint
  const userIndex = Math.floor(Math.random() * NAMES.length);

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`user-${userIndex}`, {
    userInfo: {
      name: NAMES[userIndex],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(
        Math.random() * 30
      )}.png`,
    },
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  res.status(status).end(body);
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
  ["#FF0099", "#FF7A00"],
  ["#002A95", "#00A0D2"],
  ["#6116FF", "#E32DD1"],
  ["#0EC4D1", "#1BCC00"],
  ["#FF00C3", "#FF3333"],
  ["#00C04D", "#00FFF0"],
  ["#5A2BBE", "#C967EC"],
  ["#46BE2B", "#67EC86"],
  ["#F49300", "#FFE600"],
  ["#F42900", "#FF9000"],
  ["#00FF94", "#0094FF"],
  ["#00FF40", "#1500FF"],
  ["#00FFEA", "#BF00FF"],
  ["#FFD600", "#BF00FF"],
  ["#484559", "#282734"],
  ["#881B9A", "#1D051E"],
  ["#FF00F5", "#00FFD1"],
  ["#9A501B", "#1E0505"],
  ["#FF008A", "#FAFF00"],
  ["#22BC09", "#002B1B"],
  ["#FF0000", "#000000"],
  ["#00FFB2", "#000000"],
  ["#0066FF", "#000000"],
  ["#FA00FF", "#000000"],
  ["#00A3FF", "#000000"],
  ["#00FF94", "#000000"],
  ["#AD00FF", "#000000"],
  ["#F07777", "#4E0073"],
  ["#AC77F0", "#003C73"],
];

// Just checking you have your liveblocks.io API key added, can be removed
function noKeyWarning() {
  return process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
        `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-advanced#codesandbox.\n`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
        `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-advanced#getting-started.\n`;
}
