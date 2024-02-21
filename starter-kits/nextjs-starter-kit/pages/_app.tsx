import { TooltipProvider } from "@radix-ui/react-tooltip";
import { AppProps } from "next/app";
import Head from "next/head";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Badge } from "../components/Badge";
import { LiveblocksProvider } from "../liveblocks.config";
import "../styles/globals.css";
import "../styles/text-editor.css";
import "@liveblocks/react-comments/styles.css";
import "@liveblocks/react-comments/styles/dark/media-query.css";
import "../styles/text-editor-comments.css";

export default function App({
  Component,
  pageProps,
}: AppProps<{ session: Session }>) {
  return (
    <>
      <Head>
        <title>Starter Kit</title>
        <link href="/favicon.svg" rel="icon" type="image/svg" />
      </Head>
      <LiveblocksProvider>
        <SessionProvider session={pageProps.session}>
          <TooltipProvider>
            <Component {...pageProps} />
            <Badge />
          </TooltipProvider>
        </SessionProvider>
      </LiveblocksProvider>
    </>
  );
}
