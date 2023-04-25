import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

// overrideApiKey();


export const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useUpdateMyPresence,
  useOthersMapped,
  useOthersConnectionIds,
} = createRoomContext(client);

// /**
//  * This function is used when deploying an example on liveblocks.io.
//  * You can ignore it completely if you run the example locally.
//  */
// function overrideApiKey() {
//   const query = new URLSearchParams(window?.location?.search);
//   const apiKey = query.get("apiKey");

//   if (apiKey) {
//     PUBLIC_KEY = apiKey;
//   }
// }
