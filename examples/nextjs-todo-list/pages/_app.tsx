import "@/styles/globals.css";
import { LiveblocksProvider } from "@liveblocks/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}
    >
      <Component {...pageProps} />
    </LiveblocksProvider>
  );
}
