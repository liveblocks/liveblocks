import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getRandomUser, getUser } from "../../database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
  });

  const requestBody: unknown = await request.json().catch(() => null);
  const userId = getStringProperty(requestBody, "userId");

  // Get the current user's unique id and info from your database
  const user = userId ? getUser(userId) : getRandomUser();

  if (!user) {
    return new NextResponse("User not found", { status: 403 });
  }

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, ["*:write"]);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}

function getStringProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const descriptor = Object.getOwnPropertyDescriptor(value, property);
  return typeof descriptor?.value === "string" ? descriptor.value : undefined;
}
