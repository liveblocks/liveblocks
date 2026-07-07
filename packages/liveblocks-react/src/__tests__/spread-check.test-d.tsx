import { LiveblocksProvider } from "../liveblocks";
import type { ClientOptions } from "@liveblocks/client";

declare const opts: ClientOptions;

// Pattern A: direct usage (no spread) — most common, should always work
export const A = (
  <LiveblocksProvider authEndpoint="/api/auth" />
);
export const B = (
  <LiveblocksProvider publicApiKey="pk_real" />
);

// Pattern B: spread full ClientOptions, override with NON-undefined publicApiKey
export const C = (
  <LiveblocksProvider {...opts} publicApiKey="pk_real" />
);

// Pattern C: spread full ClientOptions, override authEndpoint (no publicApiKey override)
export const D = (
  <LiveblocksProvider {...opts} authEndpoint="/api/auth" />
);

// Pattern D: spread partial (only one arm's props), override — common real usage
declare const partialOpts: Pick<ClientOptions, "authEndpoint">;
export const E = (
  <LiveblocksProvider {...partialOpts} publicApiKey="pk_real" />
);
