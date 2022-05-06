import React from "react";
import ReactDOM from "react-dom";
import { LiveblocksProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import App from "./App";
import "./index.css";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

ReactDOM.render(
  <LiveblocksProvider client={client}>
    <App />
  </LiveblocksProvider>,
  document.getElementById("root")
);
