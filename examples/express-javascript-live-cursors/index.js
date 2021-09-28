const express = require("express");
const { authorize } = require("@liveblocks/node");

const app = express();
const port = 3000;

app.use(express.static("static"));
app.use(express.json());

app.post("/auth", (req, res) => {
  authorize({
    room: req.body.room,
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  })
    .then((authResponse) => {
      res.send(authResponse.body);
    })
    .catch((er) => {
      res.status(403).end();
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
