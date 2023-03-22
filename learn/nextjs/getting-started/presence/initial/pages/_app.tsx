import type { AppProps } from "next/app";
import Script from "next/script";
import "../styles/global.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script id="liveblocks-default-scripts">
        {`{% DEFAULT_SCRIPTS %}`}
      </Script>
      <Component {...pageProps} />
    </>
  )
}
