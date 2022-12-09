import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { AppProps } from "next/app";
import Head from "next/head";
import { Badge } from "../components/Badge";
import "../styles/globals.css";

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
      <TooltipProvider>
        <SessionProvider session={pageProps.session}>
          <Component {...pageProps} />
          <Badge />
        </SessionProvider>
      </TooltipProvider>
    </>
  );
}
