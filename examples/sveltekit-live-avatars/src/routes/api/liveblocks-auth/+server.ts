import { json } from "@sveltejs/kit";
import { Liveblocks } from "@liveblocks/node";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const API_KEY = import.meta.env.VITE_LIVEBLOCKS_SECRET_KEY as string;
// @ts-ignore
const API_KEY_WARNING = process.env.CODESANDBOX_SSE
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`VITE_LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-avatars#codesandbox.`
  : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`VITE_LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-avatars#getting-started.`;

const liveblocks = new Liveblocks({
  secret: API_KEY,
});

// XXX Restore back later
// @ts-expect-error - Ignore for now
export async function POST({ request }) {
  const { room } = await request.json();

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);

    return json(
      { message: API_KEY_WARNING },
      {
        status: 403,
      }
    );
  }

  if (!room) {
    return new Response(undefined, { status: 403 });
  }

  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  const session = liveblocks.prepareSession(
    `user-${Math.floor(Math.random() * NAMES.length)}`,
    {
      userInfo: {
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(
          Math.random() * 30
        )}.png`,
      },
    }
  );

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
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
