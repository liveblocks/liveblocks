import { createClient, LiveblocksProvider } from "@liveblocks/react";
import { AppProps } from "next/app";
import "tailwindcss/tailwind.css";
import "../src/globals.css";

const client = createClient({
  authEndpoint: "/api/auth",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <Component {...pageProps} />
    </LiveblocksProvider>
  );
}
export default MyApp;
