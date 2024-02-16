import type { ClientOptions } from "@liveblocks/client";
import { createClient as realCreateClient } from "@liveblocks/client";
import { nn } from "@liveblocks/core";

const DEFAULT_E2E_OPTIONS = {
  authEndpoint: "/api/auth/access-token",
};

export const DEFAULT_THROTTLE = 100;

/**
 * Like your regular createClient(), but will override the base URL, and use
 * a faster-than-normal throttle.
 */
export function createLiveblocksClient(
  options: ClientOptions = DEFAULT_E2E_OPTIONS
) {
  options.throttle ??= DEFAULT_THROTTLE;

  return realCreateClient({
    ...options,

    // @ts-expect-error - Hidden settings
    enableDebugLogging: true,
    baseUrl: nn(
      process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
      "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
    ),
  });
}
