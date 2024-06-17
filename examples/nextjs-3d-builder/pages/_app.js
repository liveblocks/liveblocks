import Head from "next/head";
import { useMemo } from "react";
import { useRouter } from "next/router";
import { LiveObject } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

function App({ Component, pageProps }) {
  const roomId = useExampleRoomdId("nextjs-3d-builder");

  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY}
    >
      <RoomProvider id={roomId} initialStorage={{ colors: new LiveObject() }}>
        <Head>
          <title>Liveblocks</title>
          <meta name="robots" content="noindex" />
          <meta
            name="viewport"
            content="width=device-width, user-scalable=no"
          />
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
function useExampleRoomdId(roomId) {
  const { query } = useRouter();
  const exampleRoomId = useMemo(() => {
    return query?.exampleId ? `${roomId}-${query.exampleId}` : roomId;
  }, [query, roomId]);

  return exampleRoomId;
}
