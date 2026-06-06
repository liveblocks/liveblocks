import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRandomUser } from "../database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const user = getRandomUser();

  // Check if we have a cached token in cookies
  const cookieStore = cookies();
  const cachedTokenCookie = cookieStore.get("liveblocks-token");

  if (cachedTokenCookie) {
    console.log("returning cached token");
    return new NextResponse(cachedTokenCookie.value, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();

  const cookieMaxAge = 3540; // Default 59 minutes

  const response = new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Cache the raw response body in cookie, let cookie expiration handle validity
  response.cookies.set("liveblocks-token", body, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: cookieMaxAge,
  });

  return response;
}
