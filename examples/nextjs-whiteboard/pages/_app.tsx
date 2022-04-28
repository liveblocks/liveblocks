import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import { AppProps } from "next/app";
import "tailwindcss/tailwind.css";
import "../components/globals.css";
import React from "react";

const client = createClient({
  authEndpoint: "/api/auth",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <React.StrictMode>
      <LiveblocksProvider client={client}>
        <Component {...pageProps} />
      </LiveblocksProvider>
    </React.StrictMode>
  );
}
export default MyApp;
