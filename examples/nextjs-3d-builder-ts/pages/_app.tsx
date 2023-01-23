import { AppProps } from "next/app";
import Head from "next/head";
import { useMemo } from "react";
import { useRouter } from "next/router";
import { LiveObject } from "@liveblocks/client";
import { RoomProvider } from "../liveblocks.config";
// import { createRoomContext } from "@liveblocks/react";
// import { RoomProvider } from "../liveblocks.config";

function App({ Component, pageProps }: AppProps) {
  const roomId = useOverrideRoomId("nextjs-3d-builder");

  return (
    
    <RoomProvider
      id={roomId}
      initialStorage={{ colors: new LiveObject() }}
    >
      <Head>
        <title>Liveblocks</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, user-scalable=no" />
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
