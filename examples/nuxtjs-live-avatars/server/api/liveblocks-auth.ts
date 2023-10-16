import { Liveblocks, authorize } from "@liveblocks/node";

const config = useRuntimeConfig();
const API_KEY = config.liveblocksSecretKey;
const API_KEY_WARNING = config.codeSandboxSse
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars#codesandbox.`
  : `Create an \`.env\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars#getting-started.`;

const liveblocks = new Liveblocks({
  secret: API_KEY,
});

export default defineEventHandler(async (event) => {
  if (!API_KEY) {
    console.warn(API_KEY_WARNING);

    throw createError({ statusCode: 401, statusMessage: API_KEY_WARNING });
  }

  const body = await readBody(event);

  try {
    // For the avatar example, we're generating random users
    // and set their info from the authentication endpoint
    // See https://liveblocks.io/docs/rooms/authentication for more information
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
    session.allow(body.room, session.FULL_ACCESS);
    const { status, body: authBody } = await session.authorize();

    setResponseStatus(event, status);
    return authBody;
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
