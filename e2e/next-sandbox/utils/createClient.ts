import type { ClientOptions } from "@liveblocks/client";
import { createClient as realCreateClient } from "@liveblocks/client";
import { nn } from "@liveblocks/core";

export const DEFAULT_THROTTLE = 100;

export function createLiveblocksClient(options: Partial<ClientOptions> = {}) {
  const defaultAuthEndpoint = "/api/auth/access-token";

  if (
    options.publicApiKey === undefined &&
    options.authEndpoint === undefined
  ) {
    options = {
      ...options,
      publicApiKey: undefined,
      authEndpoint: defaultAuthEndpoint,
    };
  }

  return realCreateClient({
    throttle: DEFAULT_THROTTLE,

    // @ts-expect-error - Hidden settings
    baseUrl: nn(
      process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
      "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
    ),

    enableDebugLogging: true,

    ...options,
  });
}
