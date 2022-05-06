import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";

const client = createClient({
  authEndpoint: "/api/auth",
});

function App({ Component, pageProps }: AppProps) {
  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <Head>
        <title>Liveblocks</title>
      </Head>
      <Component {...pageProps} />
    </LiveblocksProvider>
  );
}
export default App;
