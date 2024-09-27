import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const USERS = [
  {
    id: "charlie.layne@example.com",
    info: {
      name: "Charlie Layne",
      color: "#D583F0",
    },
  },
  {
    id: "mislav.abha@example.com",
    info: {
      name: "Mislav Abha",
      color: "#F08385",
    },
  },
  {
    id: "tatum-paolo@example.com",
    info: {
      name: "Tatum Paolo",
      color: "#F0D885",
    },
  },
  {
    id: "anjali-wanda@example.com",
    info: {
      name: "Anjali Wanda",
      color: "#85EED6",
    },
  },
  {
    id: "jody-hekla@example.com",
    info: {
      name: "Jody Hekla",
      color: "#85BBF0",
    },
  },
  {
    id: "emil-joyce@example.com",
    info: {
      name: "Emil Joyce",
      color: "#8594F0",
    },
  },
  {
    id: "jory-quispe@example.com",
    info: {
      name: "Jory Quispe",
      color: "#85DBF0",
    },
  },
  {
    id: "quinn-elton@example.com",
    info: {
      name: "Quinn Elton",
      color: "#87EE85",
    },
  },
];

export async function POST() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }
  const user = USERS[Math.floor(Math.random() * 10) % USERS.length];

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`user-${user.id}`, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
