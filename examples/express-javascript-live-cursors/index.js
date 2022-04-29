const express = require("express");
const { authorize } = require("@liveblocks/node");

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
const API_KEY_WARNING = process.env.CODESANDBOX_SSE
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/express-javascript-live-cursors#codesandbox.`
  : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/express-javascript-live-cursors#getting-started.`;

const app = express();
const port = 3000;

app.use(express.static("static"));
app.use(express.json());

app.post("/auth", (req, res) => {
  if (!API_KEY) {
    console.warn(API_KEY_WARNING);

    return res.status(403).end(API_KEY_WARNING);
  }

  return authorize({
    room: req.body.room,
    secret: API_KEY,
  })
    .then((authResponse) => {
      res.send(authResponse.body);
    })
    .catch(() => {
      res.status(403).end();
    });
});

app.listen(port, () => {
  console.log(`Example listening at http://localhost:${port}`);
});
