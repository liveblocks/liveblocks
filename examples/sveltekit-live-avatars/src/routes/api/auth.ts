import { authorize } from "@liveblocks/node";

const API_KEY = import.meta.env.VITE_LIVEBLOCKS_SECRET_KEY as string;
// @ts-ignore
const API_KEY_WARNING = process.env.CODESANDBOX_SSE
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`VITE_LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-avatars#codesandbox.`
  : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`VITE_LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-avatars#getting-started.`;

export async function post({ request }) {
  const { room } = await request.json();

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);

    return {
      status: 403,
      body: API_KEY_WARNING,
    };
  }

  if (!room) {
    return {
      status: 403,
    };
  }

  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const response = await authorize({
    room: room,
    secret: API_KEY,
    userInfo: {
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      picture: `https://liveblocks.io/avatars/avatar-${Math.floor(Math.random() * 30)}.png`,
    },
  });

  return {
    status: response.status,
    body: response.body,
  };
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
