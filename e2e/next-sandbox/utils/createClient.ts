import type { BaseUserMeta, Client, ClientOptions } from "@liveblocks/client";
import { createClient as realCreateClient } from "@liveblocks/client";
import { nn } from "@liveblocks/core";

const DEFAULT_E2E_OPTIONS = {
  authEndpoint: "/api/auth/access-token",
};

export const DEFAULT_THROTTLE = 16;

/**
 * Like your regular createClient(), but will override the base URL, and use
 * a faster-than-normal throttle.
 */
export function createLiveblocksClient<U extends BaseUserMeta>(
  options: ClientOptions<U> = DEFAULT_E2E_OPTIONS
): Client<U> {
  return realCreateClient(createLiveblocksClientOptions(options));
}

export function createLiveblocksClientOptions<U extends BaseUserMeta>(
  options: ClientOptions<U> = DEFAULT_E2E_OPTIONS
): ClientOptions<U> {
  options.throttle ??= DEFAULT_THROTTLE;
  return {
    ...options,

    // @ts-expect-error - Hidden settings
    enableDebugLogging: true,
    baseUrl: nn(
      process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
      "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
    ),
  };
}
