import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

let PUBLIC_KEY =
  "pk_prod_-azD9Tpk-NWEPPh4Z0M6kr14_gf5G_LffyqBtkQUIRPbXfMrdTOOM7BWwXtm2pbo";

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/react-dashboard#getting-started.`
  );
}

overrideApiKey();

const client = createClient({
  publicApiKey: PUBLIC_KEY,
  liveblocksServer: "ws://127.0.0.1:8787/v6",
  publicAuthorizeEndpoint:
    "http://127.0.0.1:8787/v2/rooms/{roomId}/public/authorize",
});

export const {
  suspense: { RoomProvider, useOthers, useRoom },
} = createRoomContext(client);

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideApiKey() {
  const query = new URLSearchParams(window?.location?.search);
  const apiKey = query.get("apiKey");

  if (apiKey) {
    PUBLIC_KEY = apiKey;
  }
}
