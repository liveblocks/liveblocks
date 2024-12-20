import "./styles.css";
import "@liveblocks/react-ui/styles.css";

import type { AppProps } from "next/app";
import { StrictMode, useEffect } from "react";

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const body = document.body;
    body.style.padding = "10px 20px";

    const url = new URL(document.location.href);
    body.style.backgroundColor = url.searchParams.get("bg") ?? "white";
  }, []);

  return (
    <StrictMode>
      <div style={{ float: "right", fontSize: 10, color: "gray" }}>
        Server: {process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      </div>
      <Component {...pageProps} />
    </StrictMode>
  );
}
export default MyApp;
