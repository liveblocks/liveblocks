import "../styles/globals.css";
import type { AppProps } from "next/app";
import { RoomProvider } from "../liveblocks.config";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useMemo } from "react";
import { LiveObject } from "@liveblocks/client";

function App({ Component, pageProps }: AppProps) {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-form");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ focusedId: null }}
      initialStorage={{
        logo: new LiveObject({
          name: "Acme Inc.",
          theme: "light",
        }),
      }}
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
function useExampleRoomId(roomId: string) {
  const { query } = useRouter();
  const exampleRoomId = useMemo(() => {
    return query?.exampleId ? `${roomId}-${query.exampleId}` : roomId;
  }, [query, roomId]);

  return exampleRoomId;
}
