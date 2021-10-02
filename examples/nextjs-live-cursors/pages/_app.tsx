import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import { AppProps } from "next/app";
import "tailwindcss/tailwind.css";
import "../components/globals.css";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});


function MyApp({ Component, pageProps }: AppProps) {
  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <Component {...pageProps} />
    </LiveblocksProvider>
  );
}
export default MyApp;
