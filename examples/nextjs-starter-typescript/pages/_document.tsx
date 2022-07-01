import { Html, Head, Main, NextScript } from "next/document";

// TODO will remove this file later (Inter makes for nice Twitter videos)

export default function Document() {
  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
