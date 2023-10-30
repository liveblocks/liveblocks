import { createClient } from "@liveblocks/client";
import { nn } from "@liveblocks/core";

export default function createLiveblocksClient() {
  return createClient({
    authEndpoint: "/api/auth/access-token",

    // @ts-expect-error - Hidden settings
    baseUrl: nn(
      process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
      "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
    ),
    enableDebugLogging: true,
  });
}
