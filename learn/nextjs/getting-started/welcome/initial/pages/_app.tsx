import { useLayoutEffect } from "react"

export default function MyApp({ Component, pageProps }) {

  useLayoutEffect(() => {
    document.documentElement.classList.add("{% THEME_MODE %}");
  }, []);

  return <Component {...pageProps} />
}
