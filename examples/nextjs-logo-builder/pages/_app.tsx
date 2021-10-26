import "../styles/globals.css";
import type { AppProps } from "next/app";
import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import React from "react";

const client = createClient({
  authEndpoint: "/api/auth",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id="logo-builder">
        <Component {...pageProps} />
      </RoomProvider>
    </LiveblocksProvider>
  );
}

export default MyApp;
