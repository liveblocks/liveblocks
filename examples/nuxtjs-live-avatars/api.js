import { authorize } from "@liveblocks/node";
import express from "express";

const app = express();
app.use(express.json());

app.post("/auth", (req, res) => {
  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  if (req.body.room === "nuxt-js-live-avatars") {
    return authorize({
      room: req.body.room,
      secret: process.env.LIVEBLOCKS_SECRET_KEY,
      userInfo: {
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        picture: `/avatars/${Math.floor(Math.random() * 10)}.png`
      }
    })
      .then(authResponse => {
        res.send(authResponse.body);
      })
      .catch(er => {
        res.status(403).end();
      });
  }

  authorize({
    room: req.body.room,
    secret: process.env.LIVEBLOCKS_SECRET_KEY
  })
    .then(authResponse => {
      res.send(authResponse.body);
    })
    .catch(er => {
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
  "Quinn Elton"
];
