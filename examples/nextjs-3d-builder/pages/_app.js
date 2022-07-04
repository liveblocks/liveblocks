import Head from "next/head";
import { useMemo } from "react";
import { useRouter } from "next/router";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { createClient, LiveObject } from "@liveblocks/client";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
});

function App({ Component, pageProps }) {
  const roomId = useOverrideRoomId("nextjs-3d-builder");

  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId} initialStorage={{ colors: new LiveObject() }}>
        <Head>
          <title>Liveblocks</title>
          <meta name="robots" content="noindex" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link
            href="https://liveblocks.io/favicon-32x32.png"
            rel="icon"
            sizes="32x32"
            type="image/png"
          />
          <link
            href="https://liveblocks.io/favicon-16x16.png"
            rel="icon"
            sizes="16x16"
            type="image/png"
          />
        </Head>
        <Component {...pageProps} />
      </RoomProvider>
    </LiveblocksProvider>
  );
}
export default App;

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
