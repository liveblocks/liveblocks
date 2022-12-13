// Liveblocks API base url
export const API_BASE_URL = "https://api.liveblocks.io";

// Your Liveblocks secret key
export const SECRET_API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

// ============================================================================
if (typeof window !== "undefined") {
  console.log();
  console.error(
    "DANGER: You're using data from /liveblocks.server.config.ts on the client"
  );
  console.error("This may expose your secret key(s)");
  console.log();
}
