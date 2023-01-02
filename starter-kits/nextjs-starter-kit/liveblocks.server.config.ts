// Liveblocks API base url
export const API_BASE_URL = "https://api.liveblocks.io";

// Your Liveblocks secret key
export const SECRET_API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

// ============================================================================
if (!SECRET_API_KEY) {
  console.log();
  console.warn(
    "INFO: You must add your Liveblocks secret key to .env.local use the starter kit"
  );
  console.warn(
    "You can find your secret keys on https://liveblocks.io/dashboard"
  );
  console.warn(
    "Follow the full starter kit guide on https://liveblocks.io/docs/guides/nextjs-starter-kit"
  );
  console.log();
}

if (typeof window !== "undefined") {
  console.log();
  console.error(
    "DANGER: You're using data from /liveblocks.server.config.ts on the client"
  );
  console.error("This may expose your secret key(s)");
  console.log();
}
