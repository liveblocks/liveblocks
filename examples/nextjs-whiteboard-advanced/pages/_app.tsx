import React from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";
import { LiveblocksProvider } from "@liveblocks/react";
import { client } from "../liveblocks.config";

function App({ Component, pageProps }: AppProps) {
  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <React.StrictMode>
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
      </React.StrictMode>
    </LiveblocksProvider>
  );
}
export default App;
