import { authorize } from "@liveblocks/node";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
const API_KEY_WARNING = process.env.CODESANDBOX_SSE
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars#codesandbox.`
  : `Create an \`.env\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars#getting-started.`;

export default defineEventHandler(async (event) => {
  if (!API_KEY) {
    console.warn(API_KEY_WARNING);

    throw createError({ statusCode: 401, statusMessage: API_KEY_WARNING });
  }

  const body = await readBody(event);

  try {
    // For the avatar example, we're generating random users
    // and set their info from the authentication endpoint
    // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
    const response = await authorize({
      room: body.room,
      secret: API_KEY,
      userId: `user-${Math.floor(Math.random() * NAMES.length)}`,
      userInfo: {
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        picture: `https://liveblocks.io/avatars/avatar-${Math.floor(
          Math.random() * 30
        )}.png`,
      },
    });
    setResponseStatus(event, 202);
    return response.body;
  } catch (er) {
    throw createError({ statusCode: 403 });
  }
});

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
