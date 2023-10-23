import { createClient } from "@liveblocks/client";

export default function createLiveblocksClient() {
  return createClient({
    authEndpoint: "/api/auth/access-token",

    // @ts-expect-error - Hidden settings
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
    enableDebugLogging: true,
  });
}
