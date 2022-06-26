import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import Head from "next/head";

const client = createClient({
  authEndpoint: "/api/auth",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    /**
     * Add a LiveblocksProvider to the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <Head>
        <title>Liveblocks</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    </LiveblocksProvider>
  );
}

export default MyApp

// Just checking you have your liveblocks.io API key added, can be deleted
export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_SECRET_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-starter-typescript-tailwind#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-starter-typescript-tailwind#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}
