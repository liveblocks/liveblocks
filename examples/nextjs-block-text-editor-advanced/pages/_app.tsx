import { AppProps } from "next/app";
import Head from "next/head";
import "../styles/themes/light-theme.css";
import "../styles/themes/dark-theme.css";
import "../styles/globals.css";
import "../styles/prose.css";
import { TooltipProvider } from "@radix-ui/react-tooltip";

function App({ Component, pageProps }: AppProps) {
  return (
    <TooltipProvider>
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
    </TooltipProvider>
  );
}
export default App;
