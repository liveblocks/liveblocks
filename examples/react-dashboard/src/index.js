import React from "react";
import ReactDOM from "react-dom";
import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";

import "./index.css";
import App from "./App";

const client = createClient({
  publicApiKey: "pk_YOUR_PUBLIC_KEY", // REPLACE WITH YOUR PUBLIC KEY
});

ReactDOM.render(
  <LiveblocksProvider client={client}>
    <App />
  </LiveblocksProvider>,
  document.getElementById("root")
);
