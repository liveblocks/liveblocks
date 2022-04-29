import "../styles/globals.css";
import type { AppProps } from "next/app";
import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import Head from "next/head";
import React from "react";

const client = createClient({
  authEndpoint: "/api/auth",
});

function App({ Component, pageProps }: AppProps) {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id="nextjs-logo-builder">
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
