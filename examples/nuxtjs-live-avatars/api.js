import { authorize } from "@liveblocks/node";
import express from "express";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
const API_KEY_WARNING = process.env.CODESANDBOX_SSE
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars#codesandbox.`
  : `Create an \`.env\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars#getting-started.`;

const app = express();
app.use(express.json());

app.post("/auth", (req, res) => {
  if (!API_KEY) {
    console.warn(API_KEY_WARNING);

    return res.status(401).end(API_KEY_WARNING);
  }

  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  return authorize({
    room: req.body.room,
    secret: API_KEY,
    userInfo: {
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      picture: `/avatars/avatar-${Math.floor(Math.random() * 30)}.png`,
    },
  })
    .then((response) => {
      res.status(response.status).end(response.body);
    })
    .catch(() => {
      res.status(403).end();
    });
});

export default app;

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
