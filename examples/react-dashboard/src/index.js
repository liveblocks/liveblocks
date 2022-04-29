import React from "react";
import ReactDOM from "react-dom";
import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import App from "./App";
import "./index.css";

/**
 * Replace by your public key from https://liveblocks.io/dashboard/apikeys.
 */
const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

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
