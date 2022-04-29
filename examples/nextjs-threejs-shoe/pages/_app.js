import Head from "next/head";
import { useMemo } from "react";
import { useRouter } from "next/router";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
});

const defaultRoomId = "nextjs-threejs-shoe";

function App({ Component, pageProps }) {
  const { query } = useRouter();
  const roomId = useMemo(() => {
    /**
     * Add a suffix to the room ID using a query parameter.
     * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
     *
     * http://localhost:3000/?room=1234 → nextjs-threejs-shoe-1234
     */
    return query?.room ? `${defaultRoomId}-${query.room}` : defaultRoomId;
  }, [query]);

  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId}>
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
