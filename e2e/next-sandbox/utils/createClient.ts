import { createClient } from "@liveblocks/client";

export default function createLiveblocksClient() {
  return createClient({
    authEndpoint: "/api/auth/access-token",
    // @ts-expect-error - internal/hidden options
    liveblocksServer: process.env.NEXT_PUBLIC_LIVEBLOCKS_SERVER,
    enableDebugLogging: true,
  });
}
