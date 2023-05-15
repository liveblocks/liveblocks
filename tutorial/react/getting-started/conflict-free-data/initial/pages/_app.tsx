import type { AppProps } from "next/app";
import Script from "next/script";
import "../styles/global.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script id=/* TOKEN_STRING_RANDOM_ID */"{% RANDOM_ID %}-liveblocks-default-script">
        {`{% DEFAULT_SCRIPTS %}`}
      </Script>
      <Component {...pageProps} />
    </>
  );
}
