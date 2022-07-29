import { AppProps } from "next/app";
import Head from "next/head";
import "../styles/themes/light-theme.css";
import "../styles/themes/dark-theme.css";
import "../styles/globals.css";
import "../styles/prose.css";

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Block Text Editor</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
export default App;
