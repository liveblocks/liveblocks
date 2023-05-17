import React from "react";
import MyApp from "./index";
import Head from "next/head";
import { Provider } from "react-redux";
import store from "../src/store";

function App() {
  return (
  <React.StrictMode>
    <Provider store={store}>
      <MyApp />
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
    </Provider>
  </React.StrictMode>
  );
}

export default App;