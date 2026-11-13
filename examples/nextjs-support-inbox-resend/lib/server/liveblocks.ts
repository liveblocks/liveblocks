import { Liveblocks } from "@liveblocks/node";

// Server-only. Creates a Liveblocks REST client with the secret key.
export function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing LIVEBLOCKS_SECRET_KEY");
  }
  return new Liveblocks({
    secret,
    // Only used to point the example at a local Liveblocks dev server; inert
    // in production.
    baseUrl: process.env.LIVEBLOCKS_BASE_URL,
  });
}

export function isLiveblocksConfigured() {
  return Boolean(process.env.LIVEBLOCKS_SECRET_KEY);
}
