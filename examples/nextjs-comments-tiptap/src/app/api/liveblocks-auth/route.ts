import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { getUsers } from "@/database";

// Authenticating your Liveblocks application
// https://liveblocks.io/docs/authentication

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
  try {
    // Get auth type from query parameters or default to auth-visible
    const authType =
      request.nextUrl.searchParams.get("authType") || "auth-visible";

    // Get user based on auth type
    let user;
    let permissions: string[] = [];

    switch (authType) {
      case "auth-visible":
        // Full access user - can read, write, and see comments
        user = getUsers()[0];
        break;

      case "auth-hidden":
        // Authenticated user but can't see comments
        user = getUsers()[1];
        break;

      case "anonymous":
        // Anonymous user - read-only access
        user = {
          id: "anonymous",
          info: {
            name: "Anonymous User",
            color: "#888888",
            avatar: "",
          },
        };
        break;

      default:
        // Default to auth-visible
        user = getUsers()[0];
        permissions = ["room:read", "room:write", "room:presence:write"];
    }

    // Identify the user and return the result
    const session = await liveblocks.prepareSession(user.id, {
      userInfo: user.info,
    });

    session.allow(
      "*",
      authType === "auth-visible" || authType === "auth-hidden"
        ? session.FULL_ACCESS
        : session.READ_ACCESS
    );

    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (error) {
    console.error("Auth error:", error);
    return new Response("Authentication failed", { status: 500 });
  }
}
