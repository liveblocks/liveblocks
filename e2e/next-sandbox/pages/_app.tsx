import { createClient } from "@liveblocks/client";
import { LiveblocksProvider } from "@liveblocks/react";
import { AppProps } from "next/app";

const client = createClient({
  authEndpoint: "/api/auth",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <LiveblocksProvider client={client}>
      <Component {...pageProps} />
    </LiveblocksProvider>
  );
}
export default MyApp;
