import "@/styles/globals.css";
import { LiveblocksProvider } from "@liveblocks/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}
      // baseUrl is a hidden option not yet exposed in published types.
      // It lets us point the client at the local dev server.
      // @ts-expect-error — hidden option, see e2e/next-sandbox/utils/createClient.ts
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <Component {...pageProps} />
    </LiveblocksProvider>
  );
}
