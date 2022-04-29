import "../styles/globals.css";
import type { AppProps } from "next/app";
import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useMemo } from "react";

const client = createClient({
  authEndpoint: "/api/auth",
});

const roomId = "nextjs-logo-builder";

function App({ Component, pageProps }: AppProps) {
  const { query } = useRouter();
  const roomIdWithSuffix = useMemo(() => {
    /**
     * Add a suffix to the room ID using a query parameter.
     * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
     *
     * http://localhost:3000/?room=1234 → nextjs-logo-builder-1234
     */
    return query?.room ? `${roomId}-${query.room}` : roomId;
  }, [query]);

  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomIdWithSuffix}>
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
