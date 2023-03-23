import "../styles/globals.css";
import "reactflow/dist/base.css";
import "reactflow/dist/style.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
