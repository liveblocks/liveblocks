import type { AppProps } from "next/app";
import React from "react";

function MyApp({ Component, pageProps }: AppProps) {
  React.useEffect(() => {
    const body = document.body;
    body.style.padding = "10px 20px";

    const url = new URL(document.location.href);
    body.style.backgroundColor = url.searchParams.get("bg") ?? "white";
  }, []);

  return (
    <React.StrictMode>
      <div style={{ float: "right", fontSize: 10, color: "gray" }}>
        Server: {process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      </div>
      <Component {...pageProps} />
    </React.StrictMode>
  );
}
export default MyApp;
