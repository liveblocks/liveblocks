import type { AppProps } from "next/app";
import Head from "next/head";
import { RoomProvider } from "../src/liveblocks.config";
import { useRouter } from "next/router";
import React, { useMemo } from "react";
import "./globals.css";
import Example from "./index";

function App({ Component, pageProps }: AppProps) {
  const roomId = useOverrideRoomId("nextjs-dashboard");
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        selectedDataset: null,
        cursor: null,
        cardId: null,
      }}
    >
      <Example />
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
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
