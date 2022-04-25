import { authorize } from "@liveblocks/node";

const API_KEY = import.meta.env.VITE_LIVEBLOCKS_SECRET_KEY as string;
const API_KEY_ERROR_MESSAGE = process.env.CODESANDBOX_SSE
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`VITE_LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-cursors#codesandbox.`
  : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`VITE_LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-cursors#getting-started.`;

export async function post({ request }) {
  const { room } = await request.json();

  if (!API_KEY) {
    console.error(API_KEY_ERROR_MESSAGE);

    return {
      status: 403,
      body: API_KEY_ERROR_MESSAGE,
    };
  }

  if (!room) {
    return {
      status: 403,
    };
  }

  const response = await authorize({
    room: room,
    secret: API_KEY,
  });

  return {
    status: response.status,
    body: response.body,
  };
}
