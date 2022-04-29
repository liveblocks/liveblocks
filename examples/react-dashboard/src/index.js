import React from "react";
import ReactDOM from "react-dom";
import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import App from "./App";
import "./index.css";

const query = new URLSearchParams(window?.location?.search);

/**
 * Replace by your public key from https://liveblocks.io/dashboard/apikeys.
 */
let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

/**
 * Used for coordinating public API keys from outside (e.g. https://liveblocks.io/examples).
 *
 * http://localhost:3000/?token=pk_live_1234
 */
const token = query.get("token");

if (token) {
  PUBLIC_KEY = token;
}

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/react-dashboard#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

ReactDOM.render(
  <LiveblocksProvider client={client}>
    <App />
  </LiveblocksProvider>,
  document.getElementById("root")
);
