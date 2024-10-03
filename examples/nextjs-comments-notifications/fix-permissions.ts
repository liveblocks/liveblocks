import { Liveblocks } from "@liveblocks/node";
import dotenv from "dotenv";

dotenv.config();

const liveblocks = new Liveblocks({
  // @ts-expect-error - dev
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev",
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const rooms = [
  "liveblocks:examples:nextjs-comments-notifications:design",
  "liveblocks:examples:nextjs-comments-notifications:general-pagination",
  "liveblocks:examples:nextjs-comments-notifications:design-pagination",
  "liveblocks:examples:nextjs-comments-notifications:engineering-pagination",
];

await Promise.all(
  rooms.map((room) =>
    liveblocks.updateRoom(room, {
      defaultAccesses: [],
      usersAccesses: {
        "user-0-pagination": ["room:write"],
        "user-1-pagination": ["room:write"],
      },
    })
  )
);
